"""Document ingestion worker: python -m app.workers.ingestion"""

import asyncio
import contextlib
import logging
import signal

from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import get_settings
from app.db.session import create_engine, create_session_factory
from app.services.embeddings import Embedder, FastEmbedEmbedder
from app.services.ingestion import claim_next_document, process_document

logger = logging.getLogger("mpanampy.worker")


async def run_once(session_factory: async_sessionmaker, embedder: Embedder) -> bool:
    """Process one queued document. Returns False when the queue is empty."""
    async with session_factory() as session:
        document = await claim_next_document(session)
        if document is None:
            return False
        logger.info("Processing document %s (%s)", document.id, document.title)
        await process_document(session, embedder, document)
        logger.info("Document %s: %s", document.id, document.status.value)
        return True


async def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    embedder = FastEmbedEmbedder(settings.embedding_model, settings.embedding_cache_dir)

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    await embedder.warm_up()
    logger.info("Worker ready")
    while not stop.is_set():
        try:
            worked = await run_once(session_factory, embedder)
        except Exception:
            logger.exception("Worker iteration failed")
            worked = False
        if not worked:
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(stop.wait(), settings.worker_poll_seconds)

    await engine.dispose()
    logger.info("Worker stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(main())

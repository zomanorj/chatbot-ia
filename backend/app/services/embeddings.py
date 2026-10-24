import contextlib
import logging
import threading
from collections.abc import Sequence
from typing import Protocol

import anyio
from fastembed import TextEmbedding
from fastembed.common.model_description import ModelSource, PoolingType

logger = logging.getLogger(__name__)

# E5 models are trained with these prefixes and perform worse without them.
QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "
BATCH_SIZE = 32


class Embedder(Protocol):
    async def embed_passages(self, texts: Sequence[str]) -> list[list[float]]: ...

    async def embed_query(self, text: str) -> list[float]: ...


def _register_e5_small() -> None:
    # Not in fastembed's built-in list; registration as documented in its README.
    with contextlib.suppress(ValueError):  # already registered in this process
        TextEmbedding.add_custom_model(
            model="intfloat/multilingual-e5-small",
            pooling=PoolingType.MEAN,
            normalization=True,
            sources=ModelSource(hf="intfloat/multilingual-e5-small"),
            dim=384,
            model_file="onnx/model.onnx",
        )


class FastEmbedEmbedder:
    """Local ONNX embeddings. Loading is lazy and inference runs in a worker thread."""

    def __init__(self, model_name: str, cache_dir: str | None = None) -> None:
        _register_e5_small()
        self._model_name = model_name
        self._cache_dir = cache_dir
        self._model: TextEmbedding | None = None
        self._lock = threading.Lock()

    def _load(self) -> TextEmbedding:
        with self._lock:
            if self._model is None:
                logger.info("Loading embedding model %s", self._model_name)
                self._model = TextEmbedding(model_name=self._model_name, cache_dir=self._cache_dir)
            return self._model

    def _embed(self, texts: list[str]) -> list[list[float]]:
        model = self._load()
        return [vector.tolist() for vector in model.embed(texts, batch_size=BATCH_SIZE)]

    async def warm_up(self) -> None:
        await anyio.to_thread.run_sync(self._load)

    async def embed_passages(self, texts: Sequence[str]) -> list[list[float]]:
        return await anyio.to_thread.run_sync(self._embed, [PASSAGE_PREFIX + t for t in texts])

    async def embed_query(self, text: str) -> list[float]:
        return (await anyio.to_thread.run_sync(self._embed, [QUERY_PREFIX + text]))[0]

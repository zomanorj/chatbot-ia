"""RAG evaluation on a sample business: uv run python -m eval.run [--no-rewrite]

Runs the production pipeline (extraction, chunking, E5 embeddings, query rewrite,
prompt, Groq answer) with an exact in-memory vector search instead of PostgreSQL.
"""

import argparse
import asyncio
import json
import re
import time
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import yaml

from app.core.config import get_settings
from app.models import Bot
from app.schemas.chat import ChatMessage
from app.services.chunking import chunk_blocks
from app.services.embeddings import FastEmbedEmbedder
from app.services.extraction import detect_content_type, extract_blocks
from app.services.llm import GroqProvider, LLMError
from app.services.prompts import build_system_prompt
from app.services.query_rewrite import rewrite_query
from app.services.retrieval import Passage

ROOT = Path(__file__).parent
BOT = Bot(
    name="Vendeur Ravaka",
    language="fr",
    instructions="Boutique de vêtements et d'accessoires à Antananarivo.",
)
RETRIES = 5


@dataclass
class Result:
    id: str
    lang: str
    kind: str
    retrieval_ok: bool
    answer_ok: bool
    top_score: float | None
    sources: list[str]
    answer: str


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"(?<=\d)[\s.\u202f\u00a0](?=\d{3}\b)", "", text)


def answer_ok(case: dict, answer: str) -> bool:
    text = normalize(answer)
    if case["kind"] == "answerable":
        return all(any(normalize(alt) in text for alt in group) for group in case["must_include"])
    forbidden = case.get("must_not_include", [])
    return bool(text.strip()) and not any(re.search(p, text) for p in forbidden)


async def with_retry(call):
    for attempt in range(RETRIES):
        try:
            return await call()
        except LLMError as exc:
            if exc.code != "provider_busy" or attempt == RETRIES - 1:
                raise
            await asyncio.sleep(15 * (attempt + 1))
    raise AssertionError("unreachable")


class Index:
    def __init__(self, embedder: FastEmbedEmbedder) -> None:
        self.embedder = embedder
        self.passages: list[tuple[str, str]] = []
        self.matrix: np.ndarray | None = None

    async def build(self, files: dict[str, bytes]) -> None:
        texts: list[str] = []
        for name, data in files.items():
            blocks = extract_blocks(detect_content_type(name, data), data)
            for chunk in chunk_blocks(blocks):
                self.passages.append((name, chunk))
                texts.append(f"{name}\n{chunk}")
        self.matrix = np.array(await self.embedder.embed_passages(texts))

    async def search(self, queries: list[str], limit: int) -> list[Passage]:
        best: dict[int, float] = {}
        for query in dict.fromkeys(queries):
            scores = self.matrix @ np.array(await self.embedder.embed_query(query))
            for i in np.argsort(-scores)[:limit]:
                best[int(i)] = max(best.get(int(i), -1.0), float(scores[i]))
        ranked = sorted(best.items(), key=lambda item: item[1], reverse=True)[:limit]
        return [
            Passage(None, None, self.passages[i][0], self.passages[i][1], score)  # type: ignore[arg-type]
            for i, score in ranked
        ]


async def evaluate(case: dict, index: Index, llm: GroqProvider, args) -> Result:
    settings = get_settings()
    history = [ChatMessage(role="user", content=case["question"])]
    queries = (
        await with_retry(lambda: rewrite_query(llm, history, settings.rag_rewrite_model))
        if args.rewrite
        else [case["question"]]
    )
    passages = await index.search(queries, settings.rag_top_k) if queries else []
    context = [p for p in passages if p.score >= settings.rag_context_floor]
    confident = [p for p in context if p.score >= args.min_score]
    titles = list(dict.fromkeys(p.title for p in confident))

    # Answerable: the right document is among the confident sources.
    # Otherwise: no confident source, so the question is flagged as unanswered.
    retrieval_ok = case["source"] in titles if case["kind"] == "answerable" else not confident

    async def answer() -> str:
        prompt = build_system_prompt(BOT, context, has_knowledge=True)
        return "".join(
            [
                t
                async for t in llm.stream(
                    history, model=settings.llm_default_model, system_prompt=prompt
                )
            ]
        )

    text = await with_retry(answer)
    return Result(
        id=case["id"],
        lang=case["lang"],
        kind=case["kind"],
        retrieval_ok=retrieval_ok,
        answer_ok=answer_ok(case, text),
        top_score=round(passages[0].score, 3) if passages else None,
        sources=titles,
        answer=text,
    )


def rate(results: list[Result], attr: str, **where) -> str:
    subset = [r for r in results if all(getattr(r, k) == v for k, v in where.items())]
    if not subset:
        return "-"
    return f"{sum(getattr(r, attr) for r in subset)}/{len(subset)}"


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-rewrite", dest="rewrite", action="store_false")
    parser.add_argument("--min-score", type=float, default=get_settings().rag_min_score)
    parser.add_argument("--only", help="run a single question id")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.groq_api_key:
        raise SystemExit("GROQ_API_KEY is required")
    cases = yaml.safe_load((ROOT / "questions.yaml").read_text())
    if args.only:
        cases = [c for c in cases if c["id"] == args.only]

    index = Index(FastEmbedEmbedder(settings.embedding_model, settings.embedding_cache_dir))
    await index.build({p.name: p.read_bytes() for p in sorted((ROOT / "fixtures").iterdir())})
    llm = GroqProvider(settings.groq_api_key.get_secret_value())
    print(f"{len(index.passages)} passages | rewrite={args.rewrite} | min_score={args.min_score}\n")

    results: list[Result] = []
    started = time.monotonic()
    for case in cases:
        result = await evaluate(case, index, llm, args)
        results.append(result)
        flags = (
            f"{'ok ' if result.retrieval_ok else 'MISS'} {'ok ' if result.answer_ok else 'FAIL'}"
        )
        print(f"{flags}  {result.top_score!s:>5}  {result.id:<22} {result.sources}")
    await llm.aclose()

    print(f"\nRetrieval  all {rate(results, 'retrieval_ok')}", end="")
    for lang in ("fr", "mg", "en"):
        print(f" | {lang} {rate(results, 'retrieval_ok', lang=lang)}", end="")
    print(f"\nAnswers    all {rate(results, 'answer_ok')}", end="")
    for kind in ("answerable", "unanswerable", "smalltalk"):
        print(f" | {kind} {rate(results, 'answer_ok', kind=kind)}", end="")
    print(f"\nDuration   {time.monotonic() - started:.0f}s")

    out = ROOT / "results"
    out.mkdir(exist_ok=True)
    name = f"{'rewrite' if args.rewrite else 'raw'}-{time.strftime('%Y%m%d-%H%M%S')}.json"
    (out / name).write_text(json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2))
    print(f"Details    eval/results/{name}")


if __name__ == "__main__":
    asyncio.run(main())

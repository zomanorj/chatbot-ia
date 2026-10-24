import re

from app.services.extraction import Block

# About 175 tokens: precise enough for E5 retrieval, large enough to keep context.
TARGET_CHARS = 700
OVERLAP_CHARS = 120

_SENTENCE_END = re.compile(r"(?<=[.!?…])\s+")


def _split_long(text: str) -> list[str]:
    """Split an oversized block on sentence boundaries, then on words as a last resort."""
    pieces: list[str] = []
    for sentence in _SENTENCE_END.split(text):
        while len(sentence) > TARGET_CHARS:
            cut = sentence.rfind(" ", 0, TARGET_CHARS)
            cut = cut if cut > 0 else TARGET_CHARS
            pieces.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if sentence:
            pieces.append(sentence)
    return pieces


def _merge(pieces: list[str]) -> list[str]:
    """Group pieces into chunks of about TARGET_CHARS, repeating trailing context."""
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for piece in pieces:
        if current and size + len(piece) > TARGET_CHARS:
            chunks.append("\n".join(current))
            carry: list[str] = []
            carried = 0
            for previous in reversed(current):
                if carried + len(previous) > OVERLAP_CHARS:
                    break
                carry.insert(0, previous)
                carried += len(previous) + 1
            # Overlap only when it leaves room: a chunk made of carried text alone is a duplicate.
            current, size = (carry, carried) if carried + len(piece) <= TARGET_CHARS else ([], 0)
        current.append(piece)
        size += len(piece) + 1
    if current:
        chunks.append("\n".join(current))
    return chunks


def chunk_blocks(blocks: list[Block]) -> list[str]:
    """Standalone blocks become their own chunks; running text is merged and split."""
    chunks: list[str] = []
    running: list[str] = []

    def flush() -> None:
        chunks.extend(_merge(running))
        running.clear()

    for block in blocks:
        pieces = _split_long(block.text) if len(block.text) > TARGET_CHARS else [block.text]
        if block.standalone:
            flush()
            chunks.extend(_merge(pieces))
        else:
            running.extend(pieces)
    flush()
    return chunks

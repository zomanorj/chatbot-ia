import logging
from collections.abc import Sequence

from app.schemas.chat import ChatMessage
from app.services.llm import LLMError, LLMProvider

logger = logging.getLogger(__name__)

REWRITE_PROMPT = (
    "You prepare search queries for a small business knowledge base written mostly in French. "
    "Rewrite the customer's latest message as a short standalone search query, resolving "
    "references to earlier messages. Answer with exactly one line: the query in French, "
    'then " | ", then the same query in English. No quotes, no explanations. '
    "If the message needs no business information (greeting, thanks, small talk), "
    "answer exactly NONE."
)
NO_SEARCH = "NONE"
CONTEXT_MESSAGES = 6


async def rewrite_query(llm: LLMProvider, history: Sequence[ChatMessage], model: str) -> list[str]:
    """Search phrasings for the last message, or [] when no search is needed.

    Falls back to the raw message when the provider fails.
    """
    latest = history[-1].content
    try:
        line = await llm.complete(
            history[-CONTEXT_MESSAGES:], model=model, system_prompt=REWRITE_PROMPT, max_tokens=120
        )
    except LLMError:
        logger.warning("Query rewrite failed, using the raw message")
        return [latest]
    if line.strip().upper() == NO_SEARCH:
        return []
    rewrites = [part.strip() for part in line.split("|") if part.strip()][:2]
    return [latest, *rewrites]

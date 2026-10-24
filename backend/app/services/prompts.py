from app.models import Bot

LANGUAGE_NAMES = {"fr": "French", "mg": "Malagasy", "en": "English"}


def build_system_prompt(bot: Bot) -> str:
    language = LANGUAGE_NAMES.get(bot.language, "French")
    sections = [
        f"You are {bot.name}, the virtual assistant of a business, powered by Mpanampy.",
        "Answer clearly, concisely and politely. Use Markdown when it improves readability.",
        f"Reply in the language the customer writes in. If it is unclear, reply in {language}.",
        "Never invent prices, stock levels or policies. If you do not know, say so and offer "
        "to pass the question on to the team.",
    ]
    if bot.instructions:
        sections.append(f"Instructions from the business owner:\n{bot.instructions}")
    return "\n\n".join(sections)

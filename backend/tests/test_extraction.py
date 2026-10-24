import pytest

from app.services.chunking import OVERLAP_CHARS, TARGET_CHARS, chunk_blocks
from app.services.extraction import (
    Block,
    ExtractionError,
    detect_content_type,
    extract_blocks,
)
from app.services.leads import detect_contacts
from tests.factories import make_docx, make_pdf, make_xlsx


def extract(filename: str, data: bytes) -> list[str]:
    return [block.text for block in extract_blocks(detect_content_type(filename, data), data)]


def test_pdf() -> None:
    blocks = extract("tarifs.pdf", make_pdf("Livraison gratuite a Tana", "des 50000 Ar"))
    assert "Livraison gratuite a Tana" in " ".join(blocks)


def test_pdf_without_text_layer() -> None:
    with pytest.raises(ExtractionError) as error:
        extract("scan.pdf", make_pdf())
    assert error.value.code == "no_text"


def test_docx_paragraphs_and_table_rows() -> None:
    data = make_docx(
        ["Boutique Ravaka", "Ouverte du lundi au samedi."],
        table=[["Produit", "Prix"], ["Robe rouge", "45 000 Ar"]],
    )
    blocks = extract("infos.docx", data)
    assert blocks[:2] == ["Boutique Ravaka", "Ouverte du lundi au samedi."]
    assert "Produit: Robe rouge; Prix: 45 000 Ar" in blocks


def test_xlsx_rows_keep_their_headers() -> None:
    data = make_xlsx(
        [["Produit", "Taille", "Prix"], ["Robe rouge", "M", 45000], [None, None, None]]
    )
    assert extract("catalogue.xlsx", data) == ["Produit: Robe rouge; Taille: M; Prix: 45000"]


def test_csv_with_semicolons_and_windows_encoding() -> None:
    data = "Produit;Prix\nChemise brodée;30 000 Ar\n".encode("cp1252")
    assert extract("catalogue.csv", data) == ["Produit: Chemise brodée; Prix: 30 000 Ar"]


def test_text_paragraphs() -> None:
    data = "Horaires\n8h-18h\n\n\nLivraison\nGratuite à Tana".encode()
    assert extract("faq.txt", data) == ["Horaires 8h-18h", "Livraison Gratuite à Tana"]


def test_markdown_sections_keep_heading_with_content() -> None:
    data = b"# FAQ\n\n## Horaires\n\nDu lundi au samedi.\n\n## Paiement\n\nMVola."
    blocks = extract_blocks("text/markdown", data)
    assert [b.text for b in blocks] == ["FAQ", "Horaires\nDu lundi au samedi.", "Paiement\nMVola."]
    assert all(b.standalone for b in blocks)


def test_table_rows_become_separate_chunks() -> None:
    rows = [Block(f"Produit: Article {i}; Prix: {i} 000 Ar", standalone=True) for i in range(5)]
    assert chunk_blocks(rows) == [r.text for r in rows]


@pytest.mark.parametrize(
    ("filename", "data", "code"),
    [
        ("virus.exe", b"MZ", "unsupported_type"),
        ("fake.pdf", b"not a pdf", "corrupted_file"),
        ("fake.docx", make_xlsx([["a"]]), "corrupted_file"),
        ("binary.txt", b"\x00\x01\x02", "corrupted_file"),
    ],
)
def test_content_must_match_extension(filename: str, data: bytes, code: str) -> None:
    with pytest.raises(ExtractionError) as error:
        detect_content_type(filename, data)
    assert error.value.code == code


def test_chunks_group_small_blocks_and_respect_target() -> None:
    blocks = [Block(f"Ligne {i} : " + "x" * 90) for i in range(40)]
    chunks = chunk_blocks(blocks)
    assert len(chunks) > 1
    assert all(len(c) <= TARGET_CHARS for c in chunks)
    assert chunks[1].startswith("Ligne")  # overlap repeats the end of the previous chunk
    assert chunks[0].splitlines()[-1] == chunks[1].splitlines()[0]


def test_long_block_is_split_on_sentences() -> None:
    sentence = "La boutique livre partout à Antananarivo en vingt-quatre heures. "
    chunks = chunk_blocks([Block(sentence * 60)])
    assert all(len(c) <= TARGET_CHARS for c in chunks)
    assert all(c.rstrip().endswith(".") for c in chunks)


def test_no_chunk_made_only_of_overlap() -> None:
    chunks = chunk_blocks([Block("a" * OVERLAP_CHARS), Block("b" * (TARGET_CHARS - 50))])
    assert len(chunks) == 2
    assert "b" in chunks[1]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Antsoy aho: 034 12 345 67", [("phone", "+261 34 12 345 67")]),
        ("mon numéro +261 32 11 222 33 merci", [("phone", "+261 32 11 222 33")]),
        (
            "0331122233 ou ravaka@Mail.mg",
            [("phone", "+261 33 11 222 33"), ("email", "ravaka@mail.mg")],
        ),
        ("Commande 2024-0341234567", []),
        ("Prix: 45 000 Ar", []),
    ],
)
def test_detect_contacts(text: str, expected: list) -> None:
    assert detect_contacts(text) == expected

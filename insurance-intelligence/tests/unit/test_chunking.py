from app.ingest.chunk import chunk_pages
from conftest import fixture_page


def test_chunks_never_span_pages():
    p1 = fixture_page("sample_sob_page.txt")
    p2 = fixture_page("sample_sob_page_conflict.txt")
    p2.page_number = 2
    chunks = chunk_pages([p1, p2])
    assert {c.page_number for c in chunks} == {1, 2}
    for c in chunks:
        src = p1.text if c.page_number == 1 else p2.text
        # every chunk line must come from its own page - otherwise the citation lies
        for line in c.text.splitlines():
            if line.strip():
                assert line.strip() in src


def test_chunk_indexes_are_unique_and_ordered():
    chunks = chunk_pages([fixture_page("sample_sob_page.txt")])
    idx = [c.chunk_index for c in chunks]
    assert idx == sorted(idx) and len(set(idx)) == len(idx)

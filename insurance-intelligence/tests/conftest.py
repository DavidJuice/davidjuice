import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))

FIXTURES = pathlib.Path(__file__).parent / "fixtures"


def fixture_page(name: str):
    """Wrap a fixture text file in a pdf.Page so extraction/validation run on it
    exactly as they would on real PyMuPDF output."""
    from app.ingest.pdf import Block, Page

    text = (FIXTURES / name).read_text()
    blocks = [Block(text=ln, x0=72.0, y0=100.0 + i * 14, x1=520.0, y1=112.0 + i * 14)
              for i, ln in enumerate(text.splitlines()) if ln.strip()]
    return Page(page_number=1, text="\n".join(b.text for b in blocks),
                blocks=blocks, needs_ocr=False)

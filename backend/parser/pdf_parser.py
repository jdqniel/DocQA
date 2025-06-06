import pymupdf4llm

def load_pdf(path: str) -> str:
    md_text = pymupdf4llm.to_markdown(path)
    return md_text


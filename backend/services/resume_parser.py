"""
Resume parsing service - extracts text from uploaded PDF resumes.
"""
import io
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from a PDF file's bytes."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        full_text = "\n".join(text_parts).strip()
        logger.info(f"Extracted {len(full_text)} characters from PDF resume")
        return full_text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def clean_resume_text(raw_text: str) -> str:
    """Clean up extracted resume text for use in prompts."""
    if not raw_text:
        return ""
    # Remove excessive whitespace/blank lines
    lines = [line.strip() for line in raw_text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)

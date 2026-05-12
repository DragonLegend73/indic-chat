"""
Ingestion Service — Extract text from NCERT PDFs, chunk, and store in ChromaDB.
Uses PyMuPDF (primary) with Tesseract OCR fallback for scanned pages.
"""

import re
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("indic-chat.ingestion")


class IngestionService:
    """
    PDF → text extraction → chunking → ChromaDB storage.
    - PyMuPDF (fitz) for digital PDFs
    - Tesseract OCR fallback for scanned/image-based pages
    - Smart chunking with overlap
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text_from_pdf(self, pdf_path: str) -> list[dict]:
        """
        Extract text from a PDF file.
        Returns list of { page: int, text: str, method: str }.
        """
        import fitz  # PyMuPDF

        doc = fitz.open(pdf_path)
        pages = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text").strip()

            # Check quality: if too many non-printable chars, try OCR
            if text and self._text_quality(text) > 0.7:
                pages.append({"page": page_num + 1, "text": text, "method": "pymupdf"})
            else:
                # Fallback to OCR
                ocr_text = self._ocr_page(page)
                if ocr_text:
                    pages.append({"page": page_num + 1, "text": ocr_text, "method": "tesseract"})
                elif text:
                    # Use whatever PyMuPDF got
                    pages.append({"page": page_num + 1, "text": text, "method": "pymupdf_low_quality"})

        doc.close()
        return pages

    def _text_quality(self, text: str) -> float:
        """Estimate text quality: ratio of printable chars to total."""
        if not text:
            return 0.0
        printable = sum(1 for c in text if c.isprintable() or c.isspace())
        return printable / len(text)

    def _ocr_page(self, page) -> Optional[str]:
        """OCR a PDF page using Tesseract."""
        try:
            import pytesseract
            from PIL import Image
            import io

            # Render page to image
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes))

            # OCR with Hindi + English
            text = pytesseract.image_to_string(img, lang="hin+eng")
            return text.strip() if text.strip() else None
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return None

    def chunk_text(self, text: str, metadata: dict = None) -> list[dict]:
        """
        Split text into overlapping chunks.
        Tries to split on paragraph/sentence boundaries.
        """
        if not text.strip():
            return []

        # Clean text
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)

        # Split into paragraphs first
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        chunks = []
        current_chunk = ""
        chunk_idx = 0

        for para in paragraphs:
            if len(current_chunk) + len(para) <= self.chunk_size:
                current_chunk += ("\n\n" + para if current_chunk else para)
            else:
                if current_chunk:
                    chunk_meta = {**(metadata or {}), "chunk_index": chunk_idx}
                    chunks.append({
                        "id": f"{metadata.get('source', 'doc')}_{chunk_idx}",
                        "content": current_chunk.strip(),
                        "metadata": chunk_meta,
                    })
                    chunk_idx += 1
                    # Keep overlap from end of current chunk
                    overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else ""
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    current_chunk = para

        # Don't forget the last chunk
        if current_chunk.strip():
            chunk_meta = {**(metadata or {}), "chunk_index": chunk_idx}
            chunks.append({
                "id": f"{metadata.get('source', 'doc')}_{chunk_idx}",
                "content": current_chunk.strip(),
                "metadata": chunk_meta,
            })

        return chunks

    def ingest_pdf(self, pdf_path: str, subject: str, language: str = "eng") -> int:
        """
        Full pipeline: PDF → extract → chunk → store in ChromaDB.
        Returns number of chunks added.
        """
        from app.services.rag import get_rag_service

        logger.info(f"Ingesting: {pdf_path}")
        pages = self.extract_text_from_pdf(pdf_path)

        all_chunks = []
        source_name = Path(pdf_path).stem

        for page_data in pages:
            metadata = {
                "subject": subject,
                "language": language,
                "page": page_data["page"],
                "source": source_name,
                "extraction_method": page_data["method"],
            }
            chunks = self.chunk_text(page_data["text"], metadata)
            all_chunks.extend(chunks)

        if all_chunks:
            rag = get_rag_service()
            rag.add_chunks(all_chunks)
            logger.info(f"✅ Ingested {len(all_chunks)} chunks from {source_name}")

        return len(all_chunks)

    def ingest_directory(self, pdf_dir: str, subject: str, language: str = "eng") -> int:
        """Ingest all PDFs in a directory."""
        pdf_path = Path(pdf_dir)
        total = 0
        for pdf_file in sorted(pdf_path.glob("*.pdf")):
            total += self.ingest_pdf(str(pdf_file), subject, language)
        return total


def get_ingestion_service() -> IngestionService:
    from app.config import get_settings
    settings = get_settings()
    return IngestionService(chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)

import os
import io
from io import BytesIO

# Optional OCR imports
try:
    import pytesseract
    from PIL import Image
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

_OCR_ENGINE = None

def _ocr_engine():
    """Loads the RapidOCR model once per process (loading it is slow)."""
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        from rapidocr_onnxruntime import RapidOCR
        _OCR_ENGINE = RapidOCR()
    return _OCR_ENGINE

async def extract_text(file) -> str:
    """
    Extracts text from uploaded documents (PDF, TXT, DOCX, Markdown, or images).
    Multi-stage extraction: pdfplumber -> pypdf -> pdfminer -> OCR / docx parser.
    """
    data = await file.read()
    if not data:
        return ""

    name = (file.filename or "").lower()

    # Text-based formats
    if name.endswith((".txt", ".md", ".csv", ".log", ".rtf", ".eml")):
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError:
            return data.decode("latin-1", errors="replace")

    # Word DOCX format
    if name.endswith(".docx"):
        try:
            import zipfile, xml.etree.ElementTree as ET
            with zipfile.ZipFile(BytesIO(data)) as z:
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                texts = [node.text for node in tree.iter() if node.tag.endswith("}t") and node.text]
                return "\n".join(texts).strip()
        except Exception:
            pass

    # PDF documents
    if name.endswith(".pdf"):
        text = ""

        # Stage 1: pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(BytesIO(data)) as pdf:
                pages = [p.extract_text() or "" for p in pdf.pages[:30]]
                text = "\n".join(pages).strip()
        except Exception:
            pass

        if text and len(text.strip()) > 25:
            return text

        # Stage 2: pypdf fallback
        try:
            from pypdf import PdfReader
            reader = PdfReader(BytesIO(data))
            pages = [p.extract_text() or "" for p in reader.pages[:30]]
            text2 = "\n".join(pages).strip()
            if text2 and len(text2.strip()) > len(text.strip()):
                text = text2
        except Exception:
            pass

        if text and len(text.strip()) > 25:
            return text

        # Stage 3: pdfminer fallback
        try:
            from pdfminer.high_level import extract_text as miner_extract
            text3 = (miner_extract(BytesIO(data)) or "").strip()
            if text3 and len(text3) > len(text):
                text = text3
        except Exception:
            pass

        if text:
            return text

        # Stage 4: Scanned PDF OCR via RapidOCR
        try:
            import numpy as np
            ocr = _ocr_engine()
            with pdfplumber.open(BytesIO(data)) as pdf:
                ocr_pages = []
                for p in pdf.pages[:10]:
                    pil_img = p.to_image(resolution=200).original
                    if pil_img.mode != 'RGB':
                        pil_img = pil_img.convert('RGB')
                    res, _ = ocr(np.array(pil_img))
                    if res:
                        ocr_pages.append('\n'.join([l[1] for l in res]).strip())
                if ocr_pages:
                    return '\n\n'.join(ocr_pages).strip()
        except Exception:
            pass

        return ""

    # Image formats (.png, .jpg, .jpeg, .webp, .bmp)
    if name.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
        try:
            from PIL import Image
            import numpy as np
            img = Image.open(BytesIO(data))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            ocr = _ocr_engine()
            res, _ = ocr(np.array(img))
            if res:
                return '\n'.join([l[1] for l in res]).strip()
        except Exception:
            pass
        return ""

    # Generic fallback
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return ""

from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image, ImageEnhance, ImageFilter

APP_TOKEN = os.getenv("OCR_SERVICE_TOKEN", "")
MAX_FILE_MB = int(os.getenv("OCR_MAX_FILE_MB", "50"))
MAX_PAGES = int(os.getenv("OCR_MAX_PAGES", "100"))
DPI = int(os.getenv("OCR_DPI", "200"))

app = FastAPI(title="DIVISIONJURIDIQUE Arabic OCR", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("OCR_ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Keep the model warm. The dedicated Arabic PP-OCRv5 recognizer is selected
# explicitly because PP-OCRv6 currently does not provide Arabic recognition.
OCR = PaddleOCR(
    lang="ar",
    ocr_version="PP-OCRv5",
    device=os.getenv("OCR_DEVICE", "cpu"),
    use_doc_orientation_classify=True,
    use_doc_unwarping=False,
    use_textline_orientation=True,
)


def check_token(authorization: str | None) -> None:
    if not APP_TOKEN:
        return
    expected = f"Bearer {APP_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="غير مصرح بالوصول إلى خدمة OCR")


def normalize_arabic(text: str) -> str:
    """Conservative normalization: never change Arabic letters or numbers."""
    text = text.replace("\u200f", "").replace("\u200e", "")
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_result(result: Any) -> dict[str, Any]:
    if isinstance(result, dict):
        return result.get("res", result)
    if hasattr(result, "res") and isinstance(result.res, dict):
        return result.res
    if hasattr(result, "json"):
        data = result.json
        if isinstance(data, str):
            import json
            data = json.loads(data)
        if isinstance(data, dict):
            return data.get("res", data)
    raise RuntimeError("صيغة نتيجة PaddleOCR غير متوقعة")


def preprocess(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB")
    # Mild enhancement only. Aggressive binarization can destroy Arabic dots.
    image = ImageEnhance.Contrast(image).enhance(1.12)
    image = image.filter(ImageFilter.SHARPEN)
    return np.asarray(image)


def render_page(page: fitz.Page) -> Image.Image:
    scale = DPI / 72.0
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def page_ocr(image: Image.Image) -> tuple[str, float, list[dict[str, Any]]]:
    result = list(OCR.predict(preprocess(image)))
    if not result:
        return "", 0.0, []

    data = extract_result(result[0])
    texts = data.get("rec_texts", []) or []
    scores = data.get("rec_scores", []) or []
    boxes = data.get("rec_boxes", []) or []

    lines: list[dict[str, Any]] = []
    for i, raw_text in enumerate(texts):
        text = normalize_arabic(str(raw_text))
        if not text:
            continue
        score = float(scores[i]) if i < len(scores) else 0.0
        box = boxes[i].tolist() if i < len(boxes) and hasattr(boxes[i], "tolist") else boxes[i] if i < len(boxes) else []
        lines.append({"text": text, "confidence": round(score, 4), "bbox": box})

    # Arabic documents are normally read from top to bottom, then right to left.
    lines.sort(key=lambda item: (
        round(float(item["bbox"][1]) / 24) if len(item["bbox"]) >= 4 else 0,
        -(float(item["bbox"][0]) if len(item["bbox"]) >= 4 else 0),
    ))

    text = "\n".join(item["text"] for item in lines)
    confidence = sum(item["confidence"] for item in lines) / len(lines) if lines else 0.0
    return text, confidence, lines


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "engine": "PaddleOCR", "version": "3.7.0", "model": "PP-OCRv5 Arabic"}


@app.post("/ocr")
async def ocr_pdf(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    check_token(authorization)

    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="الملف يجب أن يكون PDF")

    raw = await file.read()
    if len(raw) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"الحد الأقصى للملف هو {MAX_FILE_MB} ميغابايت")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)

    try:
        doc = fitz.open(tmp_path)
        if doc.page_count > MAX_PAGES:
            raise HTTPException(status_code=413, detail=f"الحد الأقصى هو {MAX_PAGES} صفحة في العملية الواحدة")

        pages: list[dict[str, Any]] = []
        all_text: list[str] = []
        weighted_confidence = 0.0
        confidence_weight = 0

        for index in range(doc.page_count):
            page = doc.load_page(index)
            image = render_page(page)
            text, confidence, lines = page_ocr(image)
            pages.append({
                "page": index + 1,
                "text": text,
                "confidence": round(confidence, 4),
                "lines": lines,
            })
            all_text.append(f"\n===== الصفحة {index + 1} =====\n{text}" if text else f"\n===== الصفحة {index + 1} =====")
            weighted_confidence += confidence * max(len(lines), 1)
            confidence_weight += max(len(lines), 1)

        doc.close()
        return {
            "ok": True,
            "filename": file.filename or "document.pdf",
            "engine": "PaddleOCR 3.7.0",
            "model": "PP-OCRv5 Arabic",
            "pages": pages,
            "page_count": len(pages),
            "confidence": round(weighted_confidence / confidence_weight, 4) if confidence_weight else 0.0,
            "text": "\n".join(all_text).strip(),
            "warning": "نتيجة OCR تحتاج إلى مراجعة بشرية قبل الاعتماد عليها في مستند قضائي.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"فشل OCR: {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

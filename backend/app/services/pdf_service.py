from io import BytesIO

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader


async def extract_text_from_pdf(file: UploadFile) -> str:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        reader = PdfReader(BytesIO(content))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages_text).strip()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to read PDF file") from exc

    if not text:
        raise HTTPException(status_code=400, detail="No readable text found in PDF")

    return text

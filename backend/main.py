import os
import tempfile
import time
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

import deepl
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "").strip()
LANGUAGES = {"JA", "ZH", "KO", "ES", "FR", "DE", "PT-BR", "IT"}
# Vercel rejects request and response bodies over 4.5 MB.
MAX_MB = 4 if os.getenv("VERCEL") else 10
MAX_BYTES = MAX_MB * 1024 * 1024
PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

app = FastAPI(title="FlipDeck")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


def error(status, message):
    return JSONResponse({"error": message}, status_code=status)


@app.exception_handler(RequestValidationError)
def invalid_request(request, exc):
    return error(400, "Please upload a .pptx file.")


def pick_key(header_key):
    # A key sent by the browser wins over the one in .env.
    return header_key.strip() or DEEPL_API_KEY


@app.get("/api/health")
def health(x_deepl_key: str = Header("")):
    mode = "deepl" if pick_key(x_deepl_key) else "mock"
    return {"ok": True, "mode": mode, "max_mb": MAX_MB}


@app.get("/api/usage")
def usage(x_deepl_key: str = Header("")):
    key = pick_key(x_deepl_key)
    if not key:
        return error(400, "No DeepL API key is set.")
    try:
        character = deepl.DeepLClient(key).get_usage().character
    except deepl.AuthorizationException:
        return error(401, "DeepL rejected the API key.")
    except deepl.DeepLException as exc:
        return error(502, f"Could not reach DeepL: {exc}")
    return {"used": character.count, "limit": character.limit}


@app.post("/api/translate")
def translate(
    file: UploadFile = File(...),
    target_lang: str = Form("JA"),
    x_deepl_key: str = Header(""),
):
    filename = file.filename or ""
    key = pick_key(x_deepl_key)
    lang = target_lang.upper()

    if not filename.lower().endswith(".pptx"):
        return error(400, "Only .pptx files are supported.")
    if lang not in LANGUAGES:
        return error(400, f"Unsupported target language: {target_lang}")

    data = file.file.read(MAX_BYTES + 1)
    if not data:
        return error(400, "The file is empty.")
    if len(data) > MAX_BYTES:
        return error(413, f"File is larger than {MAX_MB} MB.")
    if not data.startswith(b"PK"):
        return error(400, "This doesn't look like a valid .pptx file.")

    try:
        if key:
            result = translate_with_deepl(data, filename, lang, key)
        else:
            result = translate_with_mock(data, lang)
    except deepl.QuotaExceededException:
        return error(429, "DeepL quota exceeded for this month.")
    except deepl.AuthorizationException:
        return error(500, "DeepL rejected the API key.")
    except deepl.DocumentTranslationException as exc:
        return error(502, f"DeepL could not translate this document: {exc}")
    except Exception as exc:
        return error(500, f"Translation failed: {exc}")

    out_name = f"{Path(filename).stem}_{lang.lower()}.pptx"
    return Response(
        result,
        media_type=PPTX_MIME,
        headers={"Content-Disposition": content_disposition(out_name)},
    )


def content_disposition(name):
    # Headers are latin-1 only, so non-ASCII names also go in filename*.
    ascii_name = name.encode("ascii", "replace").decode().replace('"', "_")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name)}"


def translate_with_deepl(data, filename, lang, key):
    client = deepl.DeepLClient(key)
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "input.pptx"
        dst = Path(tmp) / "output.pptx"
        src.write_bytes(data)
        with open(src, "rb") as fin, open(dst, "wb") as fout:
            client.translate_document(fin, fout, target_lang=lang, filename=filename)
        return dst.read_bytes()


def translate_with_mock(data, lang):
    time.sleep(1.5)
    deck = Presentation(BytesIO(data))
    for slide in deck.slides:
        tag_shapes(slide.shapes, f"[{lang}] ")
    out = BytesIO()
    deck.save(out)
    return out.getvalue()


def tag_shapes(shapes, tag):
    for shape in shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            tag_shapes(shape.shapes, tag)
        elif shape.has_text_frame:
            tag_text_frame(shape.text_frame, tag)
        elif getattr(shape, "has_table", False):
            for row in shape.table.rows:
                for cell in row.cells:
                    tag_text_frame(cell.text_frame, tag)


def tag_text_frame(text_frame, tag):
    for paragraph in text_frame.paragraphs:
        for run in paragraph.runs:
            if run.text.strip():
                run.text = tag + run.text
                break


# Serve the built frontend when it exists, so one port is enough for demos.
DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
if DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")

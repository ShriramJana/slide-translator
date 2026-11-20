# Slide Translator

Upload a PowerPoint (.pptx), pick a language, and download the translated deck with its layout intact. Translation is done by the DeepL Document API.

See [PRD.md](PRD.md) for the full spec.

## Run it

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # paste your DeepL key, or leave empty for mock mode
uvicorn main:app --reload --port 8000
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

## Mock mode

If `DEEPL_API_KEY` is empty, the backend doesn't call DeepL. It prefixes every paragraph with a tag like `[JA]` instead, which is enough to test the whole upload and download flow without using quota.

DeepL Free bills every .pptx as at least 50,000 characters out of a 500,000 monthly quota, so that is about 10 real translations per month.

## One-port demo

```bash
cd frontend && npm run build
cd ../backend && uvicorn main:app --port 8000
```

The backend serves `frontend/dist` when it exists, so the app is at http://localhost:8000.

## API

- `GET /api/health` returns `{"ok": true, "mode": "deepl" | "mock"}`
- `POST /api/translate` takes multipart form data with `file` (.pptx, up to 10 MB) and `target_lang` (`JA`, `ZH`, `KO`, `ES`, `FR`, `DE`, `PT-BR`, `IT`). It returns the translated .pptx, or `{"error": "..."}` on failure.

```bash
curl localhost:8000/api/health
curl -F file=@sample.pptx -F target_lang=JA localhost:8000/api/translate -o out.pptx -D -
```

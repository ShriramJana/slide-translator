# PRD: Slide Translator (v0, one-day build)

## 1. Goal
A web app where a user uploads a PowerPoint (.pptx), picks a target language (default **Japanese**), and downloads the translated .pptx with its layout intact. It works like FileWorld, but v0 supports PowerPoint only and must be shippable today.

## 2. Decisions (locked for v0)
| Area | Decision |
|---|---|
| Translation engine | **DeepL Document API** via the official Python SDK (`deepl`), authenticated with an **API key** stored on the backend |
| Frontend | Vite + React + TypeScript, plain CSS |
| Backend | Python 3.11+ with FastAPI, uvicorn, python-multipart, python-pptx, deepl |
| Formats | `.pptx` only |
| Languages | Selector with JA (default), ZH, KO, ES, FR, DE, PT-BR, IT |
| Accounts / payments / storage | None in v0 |
| Dev without a key | **Mock mode** when `DEEPL_API_KEY` is empty |

**Not used:** the DeepL MCP server (it is a tool for AI agents, not an app runtime) or the DeepL CLI (optional, see §10).

## 3. User flow
1. User opens the app, then drags in or picks one .pptx file.
2. The app shows the filename and size, or an error for an invalid file.
3. User picks a target language (Japanese is preselected).
4. User clicks **Translate**. The button disables and a spinner shows "Translating {file} into {language}…".
5. On success: "Done" message, **Download {name}_ja.pptx** button, and a **Translate another** button.
6. On failure: a readable error. The file stays selected, so clicking **Translate** retries.

## 4. Frontend requirements
- **F1** Single page with: a dropzone/file picker, a language `<select>`, a Translate button, and a status area.
- **F2** Client-side validation before upload. Reject the file with a message if:
  - the name doesn't end in `.pptx` (case-insensitive). Don't rely on MIME type, because browsers often leave it empty for Office files.
  - the size is 0 bytes.
  - the size is over 10 MB (the DeepL Free limit for .pptx).
- **F3** State machine `status: 'idle' | 'ready' | 'processing' | 'done' | 'error'`.
  - Translate is enabled only when a file is selected and status ≠ processing.
  - The file picker and language select are disabled while processing.
- **F4** Call `GET /api/health` on load. Show a badge if `mode === "mock"` ("Mock mode: text is only tagged") or if the backend is unreachable.
- **F5** Download: `res.blob()` → `URL.createObjectURL` → hidden `<a download>`. Take the filename from `Content-Disposition`; fall back to `{stem}_{lang}.pptx`.
- **F6** All network code lives in `src/api.ts` (`getMode`, `translatePptx`, `validateFile`). Components never call `fetch` directly.
- **F7** `vite.config.ts` proxies `/api` → `http://localhost:8000`, so dev needs no CORS setup.
- **F8** Basic responsive layout with light/dark support via CSS variables. Include a Japanese-capable font in the stack (`'Hiragino Sans', 'Noto Sans JP'`).

## 5. Backend requirements

### API contract
`GET /api/health` returns `200 {"ok": true, "mode": "deepl" | "mock"}`.

`POST /api/translate`
- Request: `multipart/form-data`
  - `file`: the .pptx (required)
  - `target_lang`: one of `JA, ZH, KO, ES, FR, DE, PT-BR, IT` (default `JA`)
- Success: `200`, body is the translated .pptx bytes
  - `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - `Content-Disposition: attachment; filename="{stem}_{lang}.pptx"`
- Failure: JSON `{"error": "<human-readable message>"}` with a status code from the table below.

| Case | Status | Message |
|---|---|---|
| Not .pptx | 400 | Only .pptx files are supported. |
| Empty file | 400 | The file is empty. |
| Not a zip (first bytes ≠ `PK`) | 400 | This doesn't look like a valid .pptx file. |
| Bad `target_lang` | 400 | Unsupported target language: X |
| Over 10 MB | 413 | File is larger than 10 MB. |
| DeepL quota exceeded | 429 | DeepL quota exceeded for this month. |
| DeepL auth failure | 500 | DeepL rejected the API key. |
| DeepL translation failure | 502 | DeepL could not translate this document: … |
| Anything else | 500 | Translation failed: … |

### Behavior
- **B1** Load `DEEPL_API_KEY` from `backend/.env`. Never send it to the frontend or log it.
- **B2** **DeepL mode** (key present):
  - Write the upload to a temp dir.
  - Call `deepl.DeepLClient(key).translate_document(fin, fout, target_lang=..., filename=...)`. This one call uploads, polls, and downloads.
  - Return the output bytes.
  - Keys ending in `:fx` automatically use `api-free.deepl.com`.
  - Map the exceptions `QuotaExceededException`, `AuthorizationException`, `DocumentTranslationException`, and `DeepLException` to the table above.
- **B3** **Mock mode** (no key):
  - Sleep about 1.5 s.
  - Open the deck with python-pptx.
  - Prefix the first non-empty run of every paragraph with `[{LANG}] `. Cover text frames, tables, and group shapes recursively.
  - Save and return the deck. This proves the full pipeline without spending quota.
- **B4** Delete temp files when the request ends. Don't persist anything.
- **B5** CORS: allow `http://localhost:5173` and expose `Content-Disposition`.
- **B6** If `frontend/dist` exists, mount it at `/`, so `npm run build` + `uvicorn` serves the whole app on one port for demos.

## 6. Project structure
```
slide-translator/
  PRD.md
  README.md
  .gitignore            # include backend/.env, node_modules, dist, __pycache__
  backend/
    main.py             # FastAPI app, routes, deepl + mock translators
    requirements.txt
    .env.example        # DEEPL_API_KEY=
  frontend/             # npm create vite@latest frontend -- --template react-ts
    vite.config.ts
    src/api.ts
    src/App.tsx
    src/App.css
    src/index.css
```

## 7. Setup and run
```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # paste your key, or leave empty for mock mode
uvicorn main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

## 8. Build order (about 60 min)
1. **(10 min)** Scaffold both apps and set up `.gitignore` and `.env.example`.
2. **(15 min)** Backend: health route, translate route with validation, mock translator. Test it with curl (§9).
3. **(20 min)** Frontend: `api.ts`, `App.tsx` state machine, styles. Test it against mock mode.
4. **(5 min)** Add the key to `.env`, restart, and translate one real deck.
5. **(10 min)** Open the result in PowerPoint and check the QA list (§9).

## 9. Testing

### Backend curl checks
```bash
curl localhost:8000/api/health
curl -F file=@sample.pptx -F target_lang=JA localhost:8000/api/translate -o out.pptx -D -
curl -F file=@notes.txt localhost:8000/api/translate          # expect 400
```

### Acceptance criteria
- [ ] Selecting a .pptx shows its name and size. Translate becomes enabled.
- [ ] A .docx, .txt, empty file, or file over 10 MB shows an error and Translate stays disabled.
- [ ] While translating, the spinner shows and all controls are disabled.
- [ ] Mock mode: the downloaded deck opens in PowerPoint with `[JA]` tags, including tables and grouped shapes.
- [ ] DeepL mode: the downloaded deck opens with Japanese text and the original layout.
- [ ] Stopping the backend mid-session gives a readable error. Restarting it and clicking Translate succeeds.
- [ ] The API key appears nowhere in the frontend bundle or the network responses.

### Translation QA for a real deck
Check for:
- text overflowing boxes (Japanese often changes line breaks)
- missing glyphs or a wrong font
- untranslated speaker notes, charts, or SmartArt
- tables and images left intact

## 10. Constraints and notes
- **DeepL Free quota:** 500,000 characters/month, and every .pptx is billed as **at least 50,000 characters**, so you get about **10 real translations per month**. Use mock mode for all UI work and save real calls for QA.
- **Per-file limit (Free):** 10 MB / 500,000 characters for .pptx.
- **One download per job:** each finished DeepL document can be downloaded only once. The SDK handles this, but never expose DeepL document IDs or links to the browser.
- **Privacy:** confirm DeepL's data-handling terms before anyone uploads real company decks.
- **Optional:** the DeepL CLI is handy for a 1-minute quality check on a sample deck before wiring the app. It isn't needed in the app.

## 11. Out of scope for v0 (later roadmap)
1. **v1:** .docx and .xlsx support. An async job model (`POST /jobs` → poll → download) for large files.
2. **v2:** Accounts, Stripe credits, object storage with 1-hour auto-delete.
3. **v3:** Own translation pipeline:
   - python-pptx/lxml extraction plus an LLM or translation API
   - East Asian font mapping (`<a:ea>`) and shrink-to-fit
   - this cuts the per-document cost floor
4. **v4:** PDF (evaluate BabelDOC), images (OCR + redraw), more formats.

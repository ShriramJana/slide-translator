# FlipDeck

FlipDeck translates PowerPoint files. You upload a `.pptx`, pick a language, and download the same deck in that language with the layout, tables and images left where they were.

The translation itself is done by the [DeepL Document API](https://developers.deepl.com/docs/api-reference/document). FlipDeck is the web app around it: a React page for uploading and downloading, and a small Python server that passes the file to DeepL and hands back the result.

Live version: https://flipdeck-psi.vercel.app

## How it works

1. You drop a `.pptx` on the page. The browser checks the extension and size before anything is uploaded.
2. A dialog asks for the target language. Japanese is preselected.
3. The file is sent to the backend, which checks it again and passes it to DeepL.
4. DeepL returns the translated deck. The backend sends it straight back and the page offers it as a download named `{original name}_{language}.pptx`.

Nothing is kept on the server. The upload is written to a temporary folder for the DeepL call and deleted as soon as the request ends.

Supported languages: Japanese, Chinese, Korean, Spanish, French, German, Portuguese (Brazil) and Italian.

## Tech stack

| Part | Built with |
|---|---|
| Frontend | React, TypeScript, Vite, plain CSS |
| Backend | Python, FastAPI, uvicorn |
| Translation | DeepL Document API through the official `deepl` Python package |
| Mock translator | `python-pptx` |

## Project structure

```
vercel.json           tells Vercel how to build and route the two halves
backend/
  main.py             the whole server: routes, validation, DeepL and mock translators
  requirements.txt    Python dependencies
  .env.example        template for the .env file that holds the DeepL key
frontend/
  index.html          page shell
  vite.config.ts      dev server config, forwards /api to the backend
  public/favicon.svg  browser tab icon
  src/
    main.tsx          mounts the React app
    App.tsx           page layout and all app state
    api.ts            every call to the backend, plus file validation
    index.css         colours, fonts and base styles (light and dark)
    App.css           styles for the page and dialogs
    components/
      Dropzone.tsx        the upload area
      Dialogs.tsx         the language, progress, done and error dialogs
      SettingsDialog.tsx  where a visitor enters their DeepL key
      LanguageSelect.tsx  searchable language dropdown
      Modal.tsx           the overlay and box every dialog sits in
      Logo.tsx            the FlipDeck logo
      icons.tsx           small line icons
```

### Backend

`backend/main.py` has three routes.

`GET /api/health` reports whether a DeepL key is available and the largest file the server accepts. The page uses it to show "DeepL connected", "Mock mode" or "Backend unreachable" in the top bar.

`GET /api/usage` asks DeepL how many characters the key has used. The Settings dialog calls it to check that a key works before saving it.

`POST /api/translate` takes the file and the language. It checks the upload in this order: file extension, language code, empty file, size, and whether the content is a zip archive (every `.pptx` is one). Then it calls one of two translators:

- `translate_with_deepl` writes the upload to a temporary folder and calls `translate_document` from the DeepL package, which uploads the file, waits for the translation and downloads the result.
- `translate_with_mock` is used when no key is set. See [Mock mode](#mock-mode).

Errors come back as JSON in the form `{"error": "message"}`, so the page can show the message as it is.

If `frontend/dist` exists, the backend also serves the built frontend. See [Running on one port](#running-on-one-port).

### Frontend

`App.tsx` holds the state for the whole page. The app is always in one of five states:

| State | What you see |
|---|---|
| `idle` | The upload area |
| `ready` | A file is chosen and the language dialog is open |
| `processing` | The progress dialog |
| `done` | The download dialog |
| `error` | A message under the upload area for a bad file, or the error dialog if translation failed |

The components only draw what they are given and report clicks back to `App.tsx`. None of them call the backend. All network code is in `api.ts`:

- `validateFile` rejects files that are not `.pptx`, are empty, or are over the size limit.
- `getStatus` calls the health route.
- `getSavedKey`, `saveKey` and `checkKey` handle the DeepL key from the Settings dialog.
- `translatePptx` uploads the file and returns the translated one. It uses `XMLHttpRequest` because that reports the moment the upload finishes, which is how the progress dialog knows to move from "Uploading" to "Translating".
- `downloadBlob` saves the result to disk.

## Getting started

You need Python 3.11 or newer and Node.js 22 or newer.

Start the backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/api` requests to the backend on port 8000.

### DeepL API key

Create a key at https://www.deepl.com/your-account/keys. There are two ways to give it to the app.

**In the browser.** Click Settings in the top bar and paste the key. The app checks it with DeepL, then saves it in that browser's local storage. It is sent to the backend in an `X-DeepL-Key` header with each request and is not stored on the server. This is how the hosted version works: every visitor uses their own key and their own quota.

**On the server.** Put it in `backend/.env`:

```
DEEPL_API_KEY=your-key-here
```

Restart the backend after changing it. Everyone who can open the app then translates with this key, so only do this on your own machine. A key entered in Settings takes priority over the one in `.env`.

Keys ending in `:fx` are free-plan keys and are sent to DeepL's free endpoint automatically.

`backend/.env` is listed in `.gitignore`. Do not commit it.

### Mock mode

If there is no key in Settings and none in `.env`, the backend does not contact DeepL. It waits a moment, then puts a tag such as `[JA]` in front of every paragraph in the deck, including text inside tables and grouped shapes. That is enough to try the whole upload and download flow without using any DeepL quota. The top bar shows "Mock mode" while this is active.

### Running on one port

For a demo you can skip the frontend dev server:

```bash
cd frontend && npm run build
cd ../backend && uvicorn main:app --port 8000
```

The backend serves the built page, so the whole app is at http://localhost:8000.

## Deploying to Vercel

`vercel.json` describes the project as two services: the Vite app in `frontend/` and the FastAPI app in `backend/`. Requests to `/api/*` go to the backend and everything else goes to the frontend, so both live on one domain.

```bash
npm i -g vercel
vercel deploy --prod
```

`.vercelignore` keeps `backend/.env` out of the upload. Without it the CLI would send your local key to Vercel along with the code, and every visitor would translate on your quota. The hosted app is meant to run with no key on the server.

Vercel limits request and response bodies to 4.5 MB, so the hosted version accepts files up to 4 MB instead of 10.

## API

Both `/api/usage` and `/api/translate` read the DeepL key from an optional `X-DeepL-Key` header and fall back to the key in `backend/.env`.

### `GET /api/health`

```json
{"ok": true, "mode": "deepl", "max_mb": 10}
```

`mode` is `"deepl"` when a key is available and `"mock"` when it is not. `max_mb` is the upload limit.

### `GET /api/usage`

```json
{"used": 50000, "limit": 500000}
```

Returns 400 if there is no key and 401 if DeepL rejects it.

### `POST /api/translate`

Send `multipart/form-data` with two fields:

| Field | Value |
|---|---|
| `file` | The `.pptx` file, up to `max_mb` |
| `target_lang` | `JA`, `ZH`, `KO`, `ES`, `FR`, `DE`, `PT-BR` or `IT`. Defaults to `JA` |

On success the response body is the translated `.pptx`, with the download name in the `Content-Disposition` header.

On failure the response is `{"error": "message"}` with one of these status codes:

| Status | When |
|---|---|
| 400 | No file, not a `.pptx`, empty file, not a real PowerPoint file, or an unsupported language |
| 413 | The file is larger than the limit |
| 429 | The DeepL quota for the month is used up |
| 500 | DeepL rejected the API key, or something unexpected went wrong |
| 502 | DeepL could not translate the document |

Try it with curl:

```bash
curl localhost:8000/api/health
curl -F file=@deck.pptx -F target_lang=JA localhost:8000/api/translate -o deck_ja.pptx
```

## Limits

- Only `.pptx` files are supported.
- Files can be up to 10 MB when you run it yourself, which is the DeepL Free limit for PowerPoint, and 4 MB on the Vercel version.
- DeepL Free includes 500,000 characters a month and bills every `.pptx` as at least 50,000, so a free key covers about 10 translations a month. Use mock mode while working on the interface.
- Translated text can be longer or shorter than the original, so check the result for text that no longer fits its box.
- Decks are sent to DeepL for translation. Read DeepL's data handling terms before uploading confidential files.
- There are no user accounts and no translation history.

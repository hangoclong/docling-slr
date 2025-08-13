# Docling Application

A simple UI to convert documents (PDF, DOCX, etc.) to Markdown using the `docling` library.

## Features

- Upload multiple documents.
- Process files one by one.
- View PDF and rendered Markdown side-by-side.
- Save the converted Markdown to a `.md` file.

## Setup (Python venv)

Run these commands from the repository root (`docling/`).

```bash
# 1) Create a virtual environment (Python 3)
python3 -m venv .venv

# 2) Activate it (macOS/Linux)
source .venv/bin/activate

# 3) Install dependencies
pip install -r requirements.txt
```

If you are on Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Start the app (dev server)

Start the FastAPI app with Uvicorn from the repo root:

```bash
uvicorn docling_app.main:app --reload --port 8008
```

Then open:

```
http://localhost:8008
```

One-liner (macOS/Linux):

```bash
source .venv/bin/activate && uvicorn docling_app.main:app --reload --port 8008
```

## Directory layout (key paths)

- `docling_app/templates/` — Jinja2 HTML templates (main UI is `index.html`).
- `docling_app/static/` — static assets (`script.js`, `style.css`, favicon).
- `docling_app/uploads/` — uploaded PDFs are stored here.
- `docling_app/core/` — PDF → Markdown conversion logic.
- `docling_app/db/` — SQLite database helpers.

## Endpoints (for reference)

- `GET /` — UI
- `POST /upload` — upload PDFs
- `POST /convert/{file_id}` — start conversion
- `GET /status/{file_id}` — job status
- `GET /result/{file_id}` — markdown result
- `GET /pdf/{file_id}` — serve original PDF

## Troubleshooting

- If port 8008 is busy, stop the previous server or use another port:
  ```bash
  uvicorn docling_app.main:app --reload --port 8010
  ```
- Always activate the venv before running the server (`source .venv/bin/activate`).

from fastapi import FastAPI, File, UploadFile, HTTPException, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List
from pydantic import BaseModel
from fastapi.responses import Response
import shutil
import os
import uuid
import datetime
from .db.database import get_db_connection, init_db
from .core.converter import convert_pdf_to_markdown

# --- App Initialization ---
app = FastAPI(
    title="Docling SLR Paper-to-Markdown Converter",
    description="A tool to convert scientific papers from PDF to Markdown for SLR analysis.",
    version="1.1.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="docling_app/static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="docling_app/templates")

# Ensure the upload directory exists
UPLOAD_DIR = "docling_app/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.on_event("startup")
def on_startup():
    init_db()

# --- Background Task ---
def run_conversion(file_id: str, file_path: str):
    """The actual conversion logic that runs in the background."""
    conn = get_db_connection()
    cursor = conn.cursor()

    job_id = str(uuid.uuid4())
    markdown_content = convert_pdf_to_markdown(file_path)

    if markdown_content:
        status = "completed"
        error_message = None
    else:
        status = "failed"
        error_message = "Failed to convert PDF with Docling."

    cursor.execute(
        "INSERT INTO conversion_jobs (id, file_id, status, result, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (job_id, file_id, status, markdown_content, error_message, datetime.datetime.now().isoformat())
    )

    # Update the master file record with the final status and completion time
    cursor.execute("UPDATE files SET status = ?, completed_at = ? WHERE id = ?", (status, datetime.datetime.now().isoformat(), file_id))

    conn.commit()
    conn.close()

# --- API Endpoints ---
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
def read_root():
    return {"status": "ok"}

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    uploaded_files = []
    conn = get_db_connection()
    cursor = conn.cursor()

    for file in files:
        file_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_data = {
            "id": file_id,
            "name": file.filename,
            "status": "uploaded",
            "created_at": datetime.datetime.now().isoformat()
        }

        # Also store the original filename for later use in chunk downloads
        cursor.execute(
            "INSERT INTO files (id, name, original_filename, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (file_data['id'], file_data['name'], file.filename, file_data['status'], file_data['created_at'])
        )
        uploaded_files.append(file_data)

    conn.commit()
    conn.close()

    return uploaded_files

@app.get("/status/{file_id}")
async def get_status(file_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, created_at, started_at, completed_at FROM files WHERE id = ?", (file_id,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return {
            "file_id": file_id, 
            "status": result[0],
            "created_at": result[1],
            "started_at": result[2],
            "completed_at": result[3]
        }
    else:
        raise HTTPException(status_code=404, detail="File not found")

@app.post("/convert/{file_id}")
def convert_file(file_id: str, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
    file_record = cursor.fetchone()
    if not file_record:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found")

    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    
    cursor.execute("UPDATE files SET status = 'processing', started_at = ? WHERE id = ?", (datetime.datetime.now().isoformat(), file_id))
    conn.commit()
    conn.close()

    background_tasks.add_task(run_conversion, file_id, file_path)

    return {"message": f"Conversion started for {file_id}"}

@app.get("/result/{file_id}")
def get_result(file_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT result FROM conversion_jobs WHERE file_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1", (file_id,))
    result = cursor.fetchone()
    conn.close()
    if not result:
        raise HTTPException(status_code=404, detail="Conversion not found or not completed.")
    return JSONResponse(content={"content": result[0]})

class DownloadRequest(BaseModel):
    file_ids: List[str]

@app.post("/download-chunk")
async def download_chunk(request: DownloadRequest):
    """Combines markdown from multiple files into a single download."""
    conn = get_db_connection()
    cursor = conn.cursor()

    combined_markdown = ""
    separator_template = "\n\n--- DOCUMENT: {filename} ---\n\n"

    for file_id in request.file_ids:
        # First, get the original filename from the 'files' table
        cursor.execute("SELECT original_filename FROM files WHERE id = ?", (file_id,))
        file_record = cursor.fetchone()
        filename = file_record[0] if file_record else "Unknown File"

        # Then, get the converted markdown from the 'conversion_jobs' table
        cursor.execute("SELECT result FROM conversion_jobs WHERE file_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1", (file_id,))
        result_record = cursor.fetchone()
        
        if result_record and result_record[0]:
            combined_markdown += separator_template.format(filename=filename)
            combined_markdown += result_record[0]

    conn.close()

    if not combined_markdown:
        raise HTTPException(status_code=404, detail="No completed conversions found for the selected files.")

    # Return as a downloadable file
    return Response(
        content=combined_markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename=docling_chunk_{datetime.datetime.now().strftime('%Y-%m-%d')}.md"
        }
    )

@app.get("/pdf/{file_id}")
async def get_pdf(file_id: str):
    """Serves the PDF file for viewing."""
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found.")
    return FileResponse(file_path, media_type='application/pdf')

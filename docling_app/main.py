from fastapi import FastAPI, File, UploadFile, HTTPException, Request
import asyncio
from concurrent.futures import ProcessPoolExecutor
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

# --- Process Pool for CPU-bound tasks ---
process_pool = ProcessPoolExecutor(max_workers=3)

def run_conversion_in_process(file_id: str, file_path: str, mode: str = "balanced"):
    """The actual conversion logic that runs in a separate process."""
    # This function is now run in a separate process, so it needs its own DB connection.
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Pass mode to the converter
        markdown_content = convert_pdf_to_markdown(file_path, mode=mode)
        if markdown_content:
            status = "completed"
            error_message = None
        else:
            status = "failed"
            error_message = "Failed to convert PDF with Docling."

        job_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO conversion_jobs (id, file_id, status, result, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (job_id, file_id, status, markdown_content, error_message, datetime.datetime.now().isoformat())
        )
        # Update the master file record with the final status
        cursor.execute("UPDATE files SET status = ?, completed_at = ? WHERE id = ?", (status, datetime.datetime.now().isoformat(), file_id))

    except Exception as e:
        # Log errors and update status to 'failed'
        print(f"Error during conversion for {file_id}: {e}")
        cursor.execute("UPDATE files SET status = 'failed', completed_at = ? WHERE id = ?", (datetime.datetime.now().isoformat(), file_id))

    finally:
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
async def convert_file(file_id: str, mode: str = "balanced"):
    """Start conversion for a file with the specified mode.
    
    Args:
        file_id: The ID of the uploaded file.
        mode: Conversion mode - 'fast', 'balanced', or 'accurate'.
    """
    # Validate mode
    valid_modes = ["fast", "balanced", "accurate"]
    if mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
    
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

    loop = asyncio.get_running_loop()
    loop.run_in_executor(process_pool, run_conversion_in_process, file_id, file_path, mode)

    return {"message": f"Conversion queued for {file_id} with mode={mode}"}

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

class ChunkedDownloadRequest(BaseModel):
    file_ids: List[str]
    chunk_size: int

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

@app.post("/download-chunked")
async def download_chunked(request: ChunkedDownloadRequest):
    """Returns information about how the files will be chunked based on the requested chunk size."""
    if request.chunk_size < 1:
        raise HTTPException(status_code=400, detail="Chunk size must be at least 1.")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get original filenames for all file IDs
    file_info = {}
    for file_id in request.file_ids:
        cursor.execute("SELECT original_filename FROM files WHERE id = ?", (file_id,))
        file_record = cursor.fetchone()
        if file_record:
            # Remove .pdf extension if present and store the base filename
            original_name = file_record[0]
            if original_name.lower().endswith('.pdf'):
                original_name = original_name[:-4]
            file_info[file_id] = original_name
        else:
            file_info[file_id] = f"unknown-{file_id}"
    
    # Calculate how many chunks we'll have
    total_files = len(request.file_ids)
    total_chunks = (total_files + request.chunk_size - 1) // request.chunk_size  # Ceiling division
    
    # Create the chunk information
    chunks = []
    for i in range(total_chunks):
        start_idx = i * request.chunk_size
        end_idx = min(start_idx + request.chunk_size, total_files)
        chunk_file_ids = request.file_ids[start_idx:end_idx]
        
        # Include file info in the chunk data
        chunk_files = []
        for idx, file_id in enumerate(chunk_file_ids):
            chunk_files.append({
                "file_id": file_id,
                "original_filename": file_info.get(file_id, f"unknown-{file_id}"),
                "number_in_chunk": idx + 1
            })
        
        chunks.append({
            "chunk_number": i + 1,
            "file_ids": chunk_file_ids,
            "files": chunk_files,
            "file_count": len(chunk_file_ids)
        })
    
    conn.close()
    
    return {
        "total_files": total_files,
        "chunk_size": request.chunk_size,
        "total_chunks": total_chunks,
        "chunks": chunks
    }

@app.get("/pdf/{file_id}")
async def get_pdf(file_id: str):
    """Serves the PDF file for viewing."""
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found.")
    return FileResponse(file_path, media_type='application/pdf')

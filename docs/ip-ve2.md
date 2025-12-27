# Improvement Plan v2 (ip-ve2.md) - Docling Optimization

## 1. Critique of ip-ve1.md

| Aspect | Weakness in v1 | Improvement in v2 |
|--------|----------------|-------------------|
| **Backend Selection** | Assumes default backend. | Explicitly use `pypdfium2` for 10x faster loading. |
| **Thread Control** | Mentions MPS but no explicit CPU threading. | Add `AcceleratorOptions.num_threads=os.cpu_count()`. |
| **Feature Toggling** | Only enables features. | Also **disable** OCR/images/enrichment by default for speed. |
| **Batch Processing** | Not addressed. | Use `page_batch_size` and parallel file processing. |
| **Error Handling** | Silent failures. | Implement retry logic and structured error reporting. |
| **Dependency Pinning** | Not mentioned. | Pin `docling>=2.0` in `requirements.txt`. |
| **Profiling** | Not mentioned. | Enable `profile_pipeline_timings` for debugging. |

---

## 2. Goal Description
Create a high-performance, configurable `docling` integration optimized for **scientific paper SLRs** with sensible defaults that balance **speed** and **accuracy**.

---

## 3. Proposed Changes

### Phase 1: Core Configuration (`docling_app/core/converter.py`)

#### [MODIFY] `converter.py` - Complete Rewrite

```python
import os
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    AcceleratorOptions,
    TableFormerMode,
)
from docling.datamodel.base_models import InputFormat

# --- Configuration ---
DOCLING_MODE = os.getenv("DOCLING_MODE", "balanced")  # "fast", "balanced", "accurate"

def _get_pipeline_options(mode: str) -> PdfPipelineOptions:
    """Returns pipeline options based on the selected mode."""
    opts = PdfPipelineOptions()
    opts.accelerator_options = AcceleratorOptions(
        num_threads=os.cpu_count() or 4,
        device="auto",  # auto-detects MPS/CUDA/CPU
    )
    
    if mode == "fast":
        opts.do_ocr = False
        opts.do_table_structure = False
        opts.generate_page_images = False
        opts.generate_picture_images = False
    elif mode == "balanced":
        opts.do_ocr = False  # Assume digital PDFs; user can override
        opts.do_table_structure = True
        opts.table_structure_options.mode = TableFormerMode.FAST
        opts.generate_page_images = False
    elif mode == "accurate":
        opts.do_ocr = True
        opts.do_table_structure = True
        opts.table_structure_options.mode = TableFormerMode.ACCURATE
        opts.table_structure_options.do_cell_matching = True
    
    return opts

def get_converter() -> DocumentConverter:
    """Factory function to create a configured DocumentConverter."""
    pipeline_options = _get_pipeline_options(DOCLING_MODE)
    format_options = {
        InputFormat.PDF: PdfFormatOption(
            pipeline_options=pipeline_options,
            backend="pypdfium2",  # Fastest backend
        )
    }
    return DocumentConverter(format_options=format_options)

# Singleton instance
_converter: DocumentConverter | None = None

def convert_pdf_to_markdown(file_path: str) -> str:
    """Converts a PDF to Markdown using the configured converter."""
    global _converter
    if _converter is None:
        _converter = get_converter()
    
    try:
        result = _converter.convert(file_path)
        return result.document.export_to_markdown()
    except Exception as e:
        # Structured error logging
        import logging
        logging.error(f"Docling conversion failed for {file_path}: {e}", exc_info=True)
        return ""
```

---

### Phase 2: Dependencies (`requirements.txt`)

#### [MODIFY] Pin docling version and add pypdfium2

```
fastapi
uvicorn[standard]
python-multipart
PyMuPDF
docling>=2.0
pypdfium2
```

---

### Phase 3: Model Prefetch Script (`scripts/prefetch_models.py`)

#### [NEW] Create script to download models on startup/deployment

```python
#!/usr/bin/env python3
"""Pre-download Docling models for offline/air-gapped use."""
from docling.models import download_models

if __name__ == "__main__":
    print("Downloading Docling models...")
    download_models()
    print("Done.")
```

---

### Phase 4: Environment Configuration

#### [NEW] Add to `start.sh` or `.env`

```bash
# Docling Mode: fast | balanced | accurate
export DOCLING_MODE="balanced"

# Limit threads if needed
# export OMP_NUM_THREADS=4
```

---

## 4. Verification Plan

| Test | Method | Expected Result |
|------|--------|-----------------|
| Speed (Fast Mode) | Convert 10-page IEEE PDF | < 5 seconds |
| Speed (Accurate Mode) | Same PDF | < 30 seconds |
| Table Accuracy | Upload PDF with complex table | Markdown table structure preserved |
| Error Handling | Upload corrupt PDF | Graceful failure with log entry |
| Mode Switching | Set `DOCLING_MODE=accurate` | Verify OCR runs |

---

## 5. Risk Assessment

> [!WARNING]
> - **`pypdfium2` Dependency**: Adds a new native dependency. Ensure compatibility in Docker/deployment.
> - **OCR Disabled by Default**: Scanned PDFs will not be fully processed in "fast" or "balanced" modes.

---

## 6. Implementation Priority

1. **High**: Update `converter.py` with mode-based configuration.
2. **Medium**: Pin dependencies and add `pypdfium2`.
3. **Low**: Create model prefetch script.

"""
Docling Document Converter with Mode-Based Configuration.

Supports three modes:
- fast: No OCR, no table structure, minimal processing. Best for clean digital PDFs.
- balanced: Table structure enabled (fast mode), no OCR. Good default for most papers.
- accurate: Full OCR, accurate table structure, cell matching. For scanned/complex docs.
"""
import os
import logging
from typing import Literal

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    AcceleratorOptions,
    TableFormerMode,
)
from docling.datamodel.base_models import InputFormat

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type alias for mode
ConversionMode = Literal["fast", "balanced", "accurate"]


def _get_pipeline_options(mode: ConversionMode) -> PdfPipelineOptions:
    """Returns pipeline options based on the selected mode."""
    opts = PdfPipelineOptions()
    
    # Timeout protection for problematic pages
    opts.document_timeout = 120  # seconds
    
    # Hardware acceleration
    # Use 2 threads to avoid GPU Out-Of-Memory errors on GPUs like 3050 Ti (4GB VRAM)
    opts.accelerator_options = AcceleratorOptions(
        num_threads=2,
        device="auto",  # auto-detects MPS (macOS) / CUDA / CPU
    )
    
    # GPU-safe batch sizes for 4GB VRAM GPUs (defaults are 4, too high for small GPUs)
    opts.layout_batch_size = 2
    opts.table_batch_size = 1  # TableFormer is most memory-intensive
    opts.ocr_batch_size = 2
    
    if mode == "fast":
        # Fastest mode: skip everything optional
        opts.do_ocr = False
        opts.do_table_structure = False
        opts.generate_page_images = False
        opts.generate_picture_images = False
        logger.info("Using FAST mode: OCR=off, Tables=off")
        
    elif mode == "balanced":
        # Balanced: tables enabled (fast mode), no OCR
        opts.do_ocr = False
        opts.do_table_structure = True
        opts.table_structure_options.mode = TableFormerMode.FAST
        opts.generate_page_images = False
        opts.generate_picture_images = False
        logger.info("Using BALANCED mode: OCR=off, Tables=fast")
        
    elif mode == "accurate":
        # Accurate: full processing including OCR
        opts.do_ocr = True
        opts.do_table_structure = True
        opts.table_structure_options.mode = TableFormerMode.ACCURATE
        opts.table_structure_options.do_cell_matching = True
        opts.generate_page_images = False  # Still skip images for speed
        opts.generate_picture_images = False
        logger.info("Using ACCURATE mode: OCR=on, Tables=accurate")
    
    return opts


def get_converter(mode: ConversionMode = "balanced") -> DocumentConverter:
    """
    Factory function to create a configured DocumentConverter.
    
    Args:
        mode: One of "fast", "balanced", or "accurate".
        
    Returns:
        A configured DocumentConverter instance.
    """
    pipeline_options = _get_pipeline_options(mode)
    format_options = {
        InputFormat.PDF: PdfFormatOption(
            pipeline_options=pipeline_options,
            backend=PyPdfiumDocumentBackend,  # memory-safe backend (avoids std::bad_alloc)
        )
    }
    return DocumentConverter(format_options=format_options)


# Cache converters by mode to avoid re-initialization overhead
_converter_cache: dict[ConversionMode, DocumentConverter] = {}


def convert_pdf_to_markdown(file_path: str, mode: ConversionMode = "balanced") -> str:
    """
    Converts a PDF to Markdown using the configured converter.
    
    Args:
        file_path: Path to the PDF file.
        mode: Conversion mode - "fast", "balanced", or "accurate".
        
    Returns:
        Markdown string, or empty string on failure.
    """
    global _converter_cache
    
    # Get or create converter for this mode
    if mode not in _converter_cache:
        logger.info(f"Creating new converter for mode: {mode}")
        _converter_cache[mode] = get_converter(mode)
    
    converter = _converter_cache[mode]
    
    try:
        logger.info(f"Converting {file_path} with mode={mode}")
        result = converter.convert(file_path)
        markdown = result.document.export_to_markdown()
        logger.info(f"Conversion successful: {len(markdown)} chars")
        return markdown
        
    except Exception as e:
        logger.error(f"Docling conversion failed for {file_path}: {e}", exc_info=True)
        return ""

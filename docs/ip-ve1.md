# Improvement Plan (ip-ve1.md) - Docling Optimization

## Goal Description
Optimize the backend `docling` integration to enhance performance and accuracy, specifically for scientific papers (SLR). The current implementation uses default settings, which may not be optimal for complex tables or older scanned PDFs.

## User Review Required
> [!IMPORTANT]
> The "Accurate" mode for table extraction is significantly slower than "Fast" mode but provides better results for complex scientific tables. I propose making this configurable or defaulting to a balanced approach.

## Proposed Changes

### 1. Advanced `DocumentConverter` Configuration
We will replace the default `DocumentConverter()` initialization with a configured instance using `PdfFormatOption` and `PdfPipelineOptions`.

#### Key Configurations:
-   **Table Structure**: Enable `do_table_structure=True`.
    -   *Option*: Set `TableFormerMode.ACCURATE` for reliable data extraction from papers.
-   **OCR**: Configure `do_ocr=True` (or auto) to handle scanned figures/older papers.
-   **Acceleration**: explicit `accelerator_options` to use MPS (Metal Performance Shaders) on macOS if available, or optimized CPU execution.

### 2. Code Structure Changes (`docling_app/core/converter.py`)
-   [MODIFY] Import `PdfFormatOption`, `PdfPipelineOptions` from `docling.datamodel.pipeline_options` and `docling.datamodel.base_models`.
-   [MODIFY] Create a `get_converter()` factory function or a singleton class that initializes the converter with these options.
-   [NEW] Add a `ConverterConfig` class/dict to allow switching between "Fast" and "Accurate" modes easily.

### 3. Model Prefetching
-   [NEW] Create a script `scripts/download_models.py` to pre-download valid artifacts. This prevents the first request from timing out or being extremely slow.

## Verification Plan

### Automated Benchmarks
-   **Speed Test**: Measure conversion time for a standard 10-page 2-column IEEE paper.
-   **Quality Test**: Verify that tables are extracted as Markdown tables (not just text blocks).

### Manual Verification
-   Upload a known complex PDF (e.g. with spanned columns/tables).
-   Check the output Markdown for table fidelity.

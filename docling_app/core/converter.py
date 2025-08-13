from docling.document_converter import DocumentConverter

# Create a single, reusable instance of the converter.
# This avoids the overhead of initializing the converter on every call, which can be significant
# if the converter loads models or other resources at startup.
_converter_instance = DocumentConverter()

def convert_pdf_to_markdown(file_path: str) -> str:
    """Converts a PDF document to Markdown using the shared Docling converter instance."""
    try:
        # Use the shared instance for conversion
        result = _converter_instance.convert(file_path)
        return result.document.export_to_markdown()
    except Exception as e:
        print(f"Error converting {file_path} with Docling: {e}")
        return ""

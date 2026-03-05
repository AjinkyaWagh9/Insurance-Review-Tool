import io
import pdfplumber

def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extracts text from a PDF file using pdfplumber.
    
    Args:
        file_content (bytes): The raw bytes of the PDF file.
        
    Returns:
        str: The combined extracted text from all pages.
    """
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            num_pages = len(pdf.pages)
            print(f"DEBUG: PDF opened, {num_pages} pages detected.")
            for i, page in enumerate(pdf.pages):
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                else:
                    print(f"DEBUG: Page {i+1} has no extractable text (likely an image).")
                    text += "\n" 
    except Exception as e:
        print(f"ERROR: OCR service failed during extraction: {e}")
        return "[EMPTY_OCR_RESULT]"
        
    if not text.strip():
        print("WARNING: No text extracted from PDF. Returning [EMPTY_OCR_RESULT]")
        return "[EMPTY_OCR_RESULT]"

    return text

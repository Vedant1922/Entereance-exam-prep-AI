import os
from PyPDF2 import PdfReader

def extract_pdfs():
    directory = '.'
    combined_text = ""
    for filename in os.listdir(directory):
        if filename.endswith(".pdf"):
            print(f"Extracting {filename}...")
            try:
                reader = PdfReader(os.path.join(directory, filename))
                combined_text += f"\n\n--- Start of {filename} ---\n\n"
                for page in reader.pages:
                    combined_text += page.extract_text() + "\n"
            except Exception as e:
                print(f"Failed to read {filename}: {e}")

    with open("extracted_notes.txt", "w", encoding="utf-8") as f:
        f.write(combined_text)
    print("Done extracting to extracted_notes.txt")

if __name__ == "__main__":
    extract_pdfs()

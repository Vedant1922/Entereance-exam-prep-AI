import os
from PyPDF2 import PdfReader

def extract_syllabus():
    directory = r'D:\JEEAI\syllabus_docs'
    output_path = r'D:\JEEAI\syllabus_docs\syllabus_extracted.txt'
    
    combined_text = ""
    for filename in os.listdir(directory):
        if filename.endswith(".pdf"):
            print(f"Extracting: {filename}")
            try:
                reader = PdfReader(os.path.join(directory, filename))
                for i, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text:
                        # Clean surrogate characters that cause encoding errors
                        text = text.encode('utf-8', errors='ignore').decode('utf-8')
                        combined_text += f"\n--- Page {i+1} ---\n{text}\n"
            except Exception as e:
                print(f"Error: {e}")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(combined_text)
    
    print(f"Done! Extracted to: {output_path}")
    print(f"Total characters: {len(combined_text)}")

if __name__ == "__main__":
    extract_syllabus()

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function extractAll() {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.pdf'));
    let combinedText = '';

    for (const file of files) {
        console.log(`Extracting ${file}...`);
        const dataBuffer = fs.readFileSync(path.join(__dirname, file));
        try {
            const pdfParseModule = await import('pdf-parse');
            const parser = pdfParseModule.default ? pdfParseModule.default : pdfParseModule;
            const data = await parser(dataBuffer);
            combinedText += `\n\n--- Start of ${file} ---\n\n`;
            combinedText += data.text;
        } catch(err) {
            console.error(`Failed to parse ${file}`, err);
        }
    }

    fs.writeFileSync(path.join(__dirname, 'extracted_notes.txt'), combinedText);
    console.log('Done extracting to extracted_notes.txt');
}

extractAll();

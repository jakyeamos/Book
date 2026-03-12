const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const SOURCE_DIR = 'C:/Users/gspea/Downloads/chapters-20260310T173927Z-1-001/chapters/';
const OUTPUT_DIR = 'chapters/raw/';

const CONVERSION_JOBS = [
    { file: 'The ritual + the rehersal(1D).docx', output: 'ch01-raw.html' },
    { file: 'The routine(2D).docx', output: 'ch02-raw.html' },
    { file: 'nico backstory(3-7D).docx', output: 'ch03-07-raw.html' },
    { file: 'static between stations (8D).docx', output: 'ch08-raw.html' },
    { file: 'Gianna_s POV(9-10W).docx', output: 'ch09-10-raw.html' },
    { file: 'Blackberries (15D).docx', output: 'ch15-raw.html' }
];

async function convertChapters() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log(`Source directory: ${SOURCE_DIR}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log('');

    for (const job of CONVERSION_JOBS) {
        const inputPath = path.join(SOURCE_DIR, job.file);
        
        if (!fs.existsSync(inputPath)) {
            console.log(`[SKIP] ${job.file} - file not found`);
            continue;
        }

        try {
            const result = await mammoth.convertToHtml({ path: inputPath });
            const outputPath = path.join(OUTPUT_DIR, job.output);
            
            fs.writeFileSync(outputPath, result.value);
            
            if (result.messages.length > 0) {
                console.log(`[WARN] ${job.output} (${result.messages.length} messages)`);
                result.messages.forEach(msg => {
                    console.log(`       ${msg.type}: ${msg.message}`);
                });
            } else {
                console.log(`[OK] ${job.output} (${result.value.length} chars)`);
            }
        } catch (err) {
            console.log(`[ERROR] ${job.file}: ${err.message}`);
        }
    }

    console.log('');
    console.log('Conversion complete.');
}

convertChapters();

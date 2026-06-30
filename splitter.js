// splitter.js
const fs = require('fs');
const csv = require('csv-parser');
const format = require('fast-csv');

const inputFile = 'SIEN_translations_Jun-30-2026.csv';
const BATCH_SIZE = 1000;

async function splitFile() {
    let batchNumber = 1;
    let count = 0;
    let currentBatch = [];

    fs.createReadStream(inputFile)
        .pipe(csv())
        .on('data', (row) => {
            currentBatch.push(row);
            count++;

            if (currentBatch.length === BATCH_SIZE) {
                saveBatch(currentBatch, batchNumber++);
                currentBatch = [];
            }
        })
        .on('end', () => {
            if (currentBatch.length > 0) saveBatch(currentBatch, batchNumber);
            console.log("تم التقسيم بنجاح!");
        });
}

function saveBatch(data, num) {
    const ws = fs.createWriteStream(`Translate_part_${num}.csv`);
    const stream = format.format({ headers: true });
    stream.pipe(ws);
    data.forEach(row => stream.write(row));
    stream.end();
}

splitFile();
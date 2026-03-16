const fs = require('fs');
const path = require('path');

// Read local file
const csvPath = '/Users/geo/Documents/교육과정박람회/교육과정_편제표_통합.csv';
const data = fs.readFileSync(csvPath, 'utf8');

const rows = data.split('\n').map(r => r.split(','));
const headers = rows[0];

console.log("=== CSV Headers ===");
headers.forEach((h, i) => {
    console.log(`${i}: ${h.trim()}`);
});

// Print first row to see if it has structure matching script.js
console.log("\n=== First Data Row ===");
if (rows[1]) {
    rows[1].forEach((v, i) => {
        console.log(`${i}: ${v.trim()}`);
    });
} else {
    console.log("No first row found.");
}

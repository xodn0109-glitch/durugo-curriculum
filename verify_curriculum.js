// Verification script: Parse the CSV exactly as script.js does, then output all parsed subjects
const Papa = require('papaparse');
const https = require('https');

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9UZxKapkv2JQup-h7x2jvotGyzbql0UgZ-zcr9-IvaZFeRFR148bw3f3wYZyYOndmk8noxakhLIz1/pub?output=csv';

function fetchCSV() {
    return new Promise((resolve, reject) => {
        https.get(GOOGLE_SHEET_CSV_URL, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    const csvText = await fetchCSV();
    const results = Papa.parse(csvText, { header: false });
    const rawData = results.data;

    console.log(`총 CSV 행 수: ${rawData.length}`);
    console.log(`\n=== 헤더 행 (0-9) ===`);
    for (let i = 0; i < 10; i++) {
        console.log(`  Row ${i}: [${rawData[i].slice(0, 12).join(' | ')}]`);
    }

    // Replicate exactly the script.js processing logic
    const processed = [];
    let currentSubjectGroup = "";

    for (let i = 10; i < rawData.length; i++) {
        const row = rawData[i];

        if (!row[1] || row[1].trim() === "" || row[1] === "자율・자치 활동") {
            if (i > 120) continue;
        }

        if (row[0] && row[0].trim() !== "") {
            currentSubjectGroup = row[0].trim().replace(/\n/g, "");
        }

        const subjectName = row[1] ? row[1].trim() : "";
        if (!subjectName) continue;

        let type = "일반";
        if (row[2] === "○") type = "공통";
        else if (row[7] === "○") type = "일반선택";
        else if (row[8] === "○") type = "진로선택";
        else if (row[9] === "○") type = "융합선택";

        let rule = row[9] ? row[9].trim() : "";

        const semesters = [
            { grade: 1, term: 1, col: 11 },
            { grade: 1, term: 2, col: 12 },
            { grade: 2, term: 1, col: 13 },
            { grade: 2, term: 2, col: 14 },
            { grade: 3, term: 1, col: 15 },
            { grade: 3, term: 2, col: 16 }
        ];

        semesters.forEach(sem => {
            const cellValue = row[sem.col] ? row[sem.col].trim() : "";
            if (cellValue !== "") {
                processed.push({
                    category: currentSubjectGroup,
                    name: subjectName,
                    type: type,
                    rule: rule !== "" ? rule : (cellValue.includes("택") ? cellValue : "필수이수"),
                    credit: cellValue.replace(/[^0-9]/g, ''),
                    grade: sem.grade,
                    term: sem.term,
                    rawCell: cellValue
                });
            }
        });
    }

    console.log(`\n=== 파싱된 총 과목 수: ${processed.length} ===\n`);

    // Group by grade and term for display
    for (let g = 1; g <= 3; g++) {
        for (let t = 1; t <= 2; t++) {
            const items = processed.filter(s => s.grade === g && s.term === t);
            console.log(`\n▶ ${g}학년 ${t}학기 (${items.length}개 과목)`);
            console.log('─'.repeat(80));
            items.forEach(s => {
                console.log(`  [${s.category}] ${s.name.padEnd(20)} | 유형: ${s.type.padEnd(6)} | ${s.credit}학점 | 선택: ${s.rule} | rawCell: "${s.rawCell}"`);
            });
        }
    }

    // Now also print raw data rows starting from row 10+ that have subject names, showing ALL columns
    console.log(`\n\n=== 원본 CSV 데이터 행 (Row 10+, 과목명이 있는 행만) ===`);
    for (let i = 10; i < rawData.length; i++) {
        const row = rawData[i];
        const subjectName = row[1] ? row[1].trim() : "";
        if (!subjectName) continue;
        console.log(`Row ${i}: col0="${row[0]}" | col1="${row[1]}" | col2="${row[2]}" | col3="${row[3]}" | col4="${row[4]}" | col5="${row[5]}" | col6="${row[6]}" | col7="${row[7]}" | col8="${row[8]}" | col9="${row[9]}" | col10="${row[10]}" | col11="${row[11]}" | col12="${row[12]}" | col13="${row[13]}" | col14="${row[14]}" | col15="${row[15]}" | col16="${row[16]}"`);
    }

    // Summary stats
    console.log(`\n\n=== 통계 요약 ===`);
    const typeCount = {};
    processed.forEach(s => {
        typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });
    console.log('유형별 개수:', typeCount);

    const gradeCreditSum = {};
    for (let g = 1; g <= 3; g++) {
        const items = processed.filter(s => s.grade === g);
        const sum = items.reduce((a, b) => a + (parseInt(b.credit) || 0), 0);
        gradeCreditSum[`${g}학년`] = sum;
    }
    console.log('학년별 학점 합계:', gradeCreditSum);
}

main().catch(console.error);

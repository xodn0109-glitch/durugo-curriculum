const fs = require('fs');
const https = require('https');

const URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9UZxKapkv2JQup-h7x2jvotGyzbql0UgZ-zcr9-IvaZFeRFR148bw3f3wYZyYOndmk8noxakhLIz1/pub?output=csv';

https.get(URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const rows = data.split('\r\n').map(r => r.split(','));
        const processed = [];
        let currentSubjectGroup = "";
        let currentGradeSelectSemester = null;
        let currentGradeSelectRule = "";

        for (let i = 7; i < rows.length; i++) {
            const row = rows[i];
            if (!row[1] || row[1].trim() === "") continue;

            if (row[0] && row[0].trim() !== "") {
                currentSubjectGroup = row[0].trim().replace(/\n/g, "");
            }

            const subjectName = row[1].trim();
            const type = "일반"; 
            
            let rule = "";
            if (row[9] && row[9].trim() !== "") rule = row[9].trim();
            else if (row[10] && row[10].trim() !== "") rule = row[10].trim();

            const semesters = [
                { grade: 1, term: 1, col: 12 },
                { grade: 1, term: 2, col: 13 },
                { grade: 2, term: 1, col: 14 },
                { grade: 2, term: 2, col: 15 },
                { grade: 3, term: 1, col: 16 },
                { grade: 3, term: 2, col: 17 }
            ];

            const isGradeSelect = row[3] === "○";

            if (isGradeSelect) {
                let foundSemester = null;
                semesters.forEach(sem => {
                    const cellValue = row[sem.col] ? row[sem.col].trim() : "";
                    if (cellValue !== "") {
                        foundSemester = { grade: sem.grade, term: sem.term };
                    }
                });

                if (foundSemester) currentGradeSelectSemester = foundSemester;
                if (rule) currentGradeSelectRule = rule;

                const individualCredit = row[18] ? row[18].trim().replace(/[^0-9]/g, '') : "";

                if (currentGradeSelectSemester) {
                    processed.push({
                        category: currentSubjectGroup,
                        name: subjectName,
                        rule: currentGradeSelectRule || "선택",
                        grade: currentGradeSelectSemester.grade
                    });
                }
            }
        }

        // Print 3학년 subjects
        console.log("=== 3학년 선택과목 ===");
        processed.filter(s => s.grade === 3).forEach(s => {
            console.log(`[${s.category}] ${s.name} - Rule: ${s.rule}`);
        });
    });
});

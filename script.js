document.addEventListener('DOMContentLoaded', () => {
    // ---- CONFIGURATION ----
    // CSV URLs are defined globally above
    
    // ---- STATE ----
    let curriculumData = [];
    
    // ---- DOM ELEMENTS ----
    const loader = document.getElementById('loader');
    const guideSection = document.getElementById('guide-section');
    const curriculumSection = document.getElementById('curriculum-section');
    const subjectsContainer = document.getElementById('subjects-container');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // Modal Elements
    const modal = document.getElementById('subject-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    // ---- INITIALIZATION ----
    // Wait for year selection instead of auto-loading
    window.addEventListener('yearSelected', (e) => {
        const year = e.detail;
        console.log("Year selected event inside DOMContentLoaded:", year);
        fetchData(year);
    });
    
    // Check if the year was already selected before DOMContentLoaded
    if (window._selectedYear) {
        console.log("Adding year found pre-load:", window._selectedYear);
        fetchData(window._selectedYear);
    }
    setupEventListeners();

    // ---- CORE LOGIC ----
    function fetchData(year) {
        const csvUrl = CSV_URLS[year];
        if (!csvUrl) {
            console.error("Unknown year:", year);
            return;
        }
        
        // Reset UI state for re-loading
        loader.classList.remove('hidden');
        guideSection.classList.add('hidden');
        curriculumSection.classList.add('hidden');
        subjectsContainer.innerHTML = '';
        
        Papa.parse(csvUrl, {
            download: true,
            header: false, // The sheet has a complex header, we'll parse it manually by index
            complete: function(results) {
                processData(results.data);
            },
            error: function(err) {
                console.error("Error parsing CSV:", err);
                loader.innerHTML = `<p style="color:red"><i class="ph ph-warning"></i> 데이터를 불러오는데 실패했습니다.</p>`;
            }
        });
    }

    function processData(rawData) {
        // Data format analysis based on the provided CSV screenshot/text:
        // Rows 0 to 9 are complex headers.
        // Data starts roughly at row 10 in 0-indexed array.
        // Column indices:
        // 0: 교과군 (Subject Group) e.g., 국어
        // 1: 과목명 (Subject Name) e.g., 공통국어1
        // ...
        // 11: 1학년 1학기 (Credit/Type)
        // 12: 1학년 2학기
        // 13: 2학년 1학기
        // 14: 2학년 2학기
        // 15: 3학년 1학기
        // 16: 3학년 2학기

        const processed = [];
        let currentSubjectGroup = "";
        let currentGradeSelectSemester = null; // Track semester for grade-selected groups
        let currentGradeSelectRule = ""; // Track selection rule for grade-selected groups

        // Iterate starting from row 10 (data rows)
        for (let i = 7; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Stop parsing if we hit the summary rows at the bottom or extracurricular activities
            if (!row[1] || row[1].trim() === "" || 
                row[1] === "자율・자치 활동" || 
                row[1] === "동아리 활동" || 
                row[1] === "진로 활동" ||
                (row[0] && row[0].includes("창의적\n 체험활동"))) {
                if(i > 120) continue; // Skip totals/summary rows
                continue; // Skip extracurricular activities entirely
            }

            // Keep track of merged cells for Subject Group
            if (row[0] && row[0].trim() !== "") {
                currentSubjectGroup = row[0].trim().replace(/\n/g, "");
            }

            const subjectName = row[1] ? row[1].trim() : "";
            if (!subjectName) continue; // Skip empty rows

            // Extract Type (Common, Selective, etc)
            let type = "일반";
            if (row[4] === "○") type = "공통";
            else if (row[5] === "○") type = "일반선택";
            else if (row[6] === "○") type = "진로선택";
            else if (row[7] === "○") type = "융합선택";
            
            // Selection Rule (e.g. 택1, 택4(3)) -> col 9 (1학기) or col 10 (2학기)
            let rule = "";
            if (row[9] && row[9].trim() !== "") rule = row[9].trim();
            else if (row[10] && row[10].trim() !== "") rule = row[10].trim();

            // Semester column mapping (based on actual CSV structure after checking raw data)
            // 1학년 1학기: col 12 (13th column)
            // 1학년 2학기: col 13
            // 2학년 1학기: col 14
            // 2학년 2학기: col 15
            // 3학년 1학기: col 16
            // 3학년 2학기: col 17
            const semesters = [
                { grade: 1, term: 1, col: 12 },
                { grade: 1, term: 2, col: 13 },
                { grade: 2, term: 1, col: 14 },
                { grade: 2, term: 2, col: 15 },
                { grade: 3, term: 1, col: 16 },
                { grade: 3, term: 2, col: 17 }
            ];

            const isGradeSelect = row[3] === "○"; // 학년선택 과목

            if (isGradeSelect) {
                // Grade-selected subjects: Google Sheet uses merged cells.
                // Only the first subject in a group has semester data (as group total).
                // Subsequent subjects inherit the semester.
                let foundSemester = null;
                semesters.forEach(sem => {
                    const cellValue = row[sem.col] ? row[sem.col].trim() : "";
                    if (cellValue !== "") {
                        foundSemester = { grade: sem.grade, term: sem.term };
                    }
                });

                if (foundSemester) {
                    currentGradeSelectSemester = foundSemester;
                }
                if (rule) {
                    currentGradeSelectRule = rule;
                }

                // Individual credit from col 18 (편성)
                const individualCredit = row[18] ? row[18].trim().replace(/[^0-9]/g, '') : "";

                if (currentGradeSelectSemester && individualCredit) {
                    processed.push({
                        category: currentSubjectGroup,
                        name: subjectName,
                        type: type,
                        rule: currentGradeSelectRule || "선택",
                        credit: individualCredit,
                        grade: currentGradeSelectSemester.grade,
                        term: currentGradeSelectSemester.term,
                        rawDetails: row
                    });
                }
            } else {
                // School-designated subjects: use semester columns directly
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
                            rawDetails: row
                        });
                    }
                });
            }
        }

        curriculumData = processed;
        
        // Hide loader, show UI
        loader.classList.add('hidden');
        guideSection.classList.remove('hidden');
        curriculumSection.classList.remove('hidden');
        
        // Initial Render (Grade 1)
        renderSubjects(1);
    }

    function renderSubjects(grade) {
        subjectsContainer.innerHTML = ''; // Clear existing
        
        // Filter data for the selected grade
        const gradeData = curriculumData.filter(s => s.grade === grade);
        
        // 1학년인 경우 안내 문구 추가
        if (grade === 1) {
            const notice = document.createElement('div');
            notice.className = 'grade-notice fade-in';
            notice.innerHTML = `
                <div class="notice-icon"><i class="ph ph-info"></i></div>
                <div class="notice-content">
                    <strong>안내 사항:</strong> 1학년의 [예술(음악/미술), 기술·가정/정보/제2외국어/교양] 등 일부 필수 과목은 반별 교육과정 편성에 따라 1학기와 2학기에 교차로 이수하게 됩니다. (어느 학기에 이수하든 전체 이수 단위는 동일합니다.)
                </div>
            `;
            subjectsContainer.appendChild(notice);
        }

        // Group by Semester
        const term1 = gradeData.filter(s => s.term === 1);
        const term2 = gradeData.filter(s => s.term === 2);

        // Render Term 1
        if (term1.length > 0) {
            subjectsContainer.appendChild(createSemesterBlock(1, grade, term1));
        }

        // Render Term 2
        if (term2.length > 0) {
            subjectsContainer.appendChild(createSemesterBlock(2, grade, term2));
        }
    }

    function createSemesterBlock(term, grade, subjects) {
        const block = document.createElement('div');
        block.className = 'semester-block fade-in';
        
        // Group subjects by their selection rule
        const ruleGroups = {};
        // To keep "필수이수" at the top, we can use a specific key or sort later
        subjects.forEach(s => {
            let r = s.rule;
            if (!r) r = "기타";
            
            // Normalize '필수' strings
            if (r.includes("필수")) r = "필수이수";
            
            if (!ruleGroups[r]) ruleGroups[r] = [];
            ruleGroups[r].push(s);
        });

        // Sort rules so "필수이수" comes first
        const sortedRules = Object.keys(ruleGroups).sort((a, b) => {
            if (a === "필수이수") return -1;
            if (b === "필수이수") return 1;
            return a.localeCompare(b);
        });

        block.innerHTML = `
            <div class="semester-title">
                <div><i class="ph ph-calendar-blank"></i> ${term === 0 ? `${grade}학년 전체 교육과정` : `${grade}학년 ${term}학기`}</div>
                <span class="semester-credits">배정 과목 수: ${subjects.length}개</span>
            </div>
            ${sortedRules.map(ruleName => {
                const groupSubjects = ruleGroups[ruleName];
                const isMandatory = ruleName === '필수이수';
                
                // Parse friendly rule names. e.g. "택1(2)" -> "1과목 선택 (2학점)"
                let friendlyRuleName = ruleName;
                const match = ruleName.match(/택(\d+)\((\d+)\)/);
                if (match) {
                    friendlyRuleName = `${match[1]}과목 선택 (${match[2]}학점)`;
                } else if (ruleName.includes('택1')) {
                     friendlyRuleName = '1과목 선택';
                }

                const displayTitle = isMandatory ? '필수 이수 과목' : `[ ${friendlyRuleName} ] 그룹`;
                const titleIcon = isMandatory ? '<i class="ph ph-check-circle fill"></i>' : '<i class="ph ph-cursor-click fill"></i>';
                const titleClass = isMandatory ? 'rule-title mandatory' : 'rule-title elective';
                
                return `
                <div class="rule-group ${isMandatory ? 'mandatory' : 'elective'}">
                    <div class="${titleClass}">${titleIcon} ${displayTitle} <span class="rule-count">(${groupSubjects.length}과목 중)</span></div>
                    <div class="subject-grid">
                        ${groupSubjects.map(s => {
                            // 1학년 교차이수 과목 시각적 표시 처리
                            const isCrossover = s.grade === 1 && 
                                (s.category === '예술' || s.name.includes('기술') || s.name.includes('정보') || s.category === '교양' || s.name.includes('한문'));
                            
                            const ruleBadgeText = isCrossover 
                                ? '<span class="subj-rule crossover">1 또는 2학기 이수</span>'
                                : (s.rule && s.rule !== '필수이수' 
                                    ? `<span class="subj-rule">${s.rule.replace(/택(\d+)\((\d+)\)/, "$1과목 선택 ($2학점)")}</span>` 
                                    : `<span class="subj-rule mandatory">필수</span>`);

                            return `
                            <div class="subject-card" onclick='openModal(${JSON.stringify(s).replace(/'/g, "&#39;")})'>
                                <div class="card-top">
                                    <span class="subj-cat">${s.category}</span>
                                    <span class="subj-type">${s.type}</span>
                                </div>
                                <div class="subj-name">${s.name}</div>
                                <div class="card-bottom">
                                    <span class="subj-credit">${s.credit ? s.credit + '학점' : '-'}</span>
                                    ${ruleBadgeText}
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        `;
        return block;
    }

    // ---- EVENT LISTENERS ----
    function setupEventListeners() {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active tab styling
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Get Grade from data-target
                const target = e.target.getAttribute('data-target'); // "grade-1"
                const grade = parseInt(target.split('-')[1]);
                
                // Render
                renderSubjects(grade);
            });
        });

        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(); // click outside to close
        });
    }

    // ---- MODAL CONTROLS ----
    // Make openModal global so inline onclick works
    window.openModal = function(subjectInfo) {
        document.getElementById('modal-title').innerText = subjectInfo.name;
        document.getElementById('modal-category').innerText = subjectInfo.category;
        document.getElementById('modal-semester').innerText = `${subjectInfo.grade}학년 ${subjectInfo.term}학기`;
        document.getElementById('modal-credits').innerText = subjectInfo.credit ? `${subjectInfo.credit} 단위(학점)` : '정보 없음';
        document.getElementById('modal-type').innerText = subjectInfo.type + (subjectInfo.rule !== '필수이수' ? ` (${subjectInfo.rule})` : '');
        
        // FUTURE: Fetch from secondary JSON/Sheet for teacher comments
        document.getElementById('modal-teacher-comment').innerHTML = `
            ${subjectInfo.name} 과목에 대한 담당 선생님의 코멘트가 보여질 영역입니다.<br>
            <span style="color:var(--text-muted); font-size:0.85em;">(현재 연동 대기 중 - 별도 배포되는 교사 입력 시트에서 가져올 예정)</span>
        `;
        
        document.getElementById('modal-official-desc').innerText = `2022 개정 교육과정 ${subjectInfo.category} 교과(군)에 해당하는 과목입니다.`;

        modal.classList.add('active');
    };

    function closeModal() {
        modal.classList.remove('active');
    }
});

// Principal Message Modal Controller
document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('principal-trigger');
    const modal = document.getElementById('principal-modal');
    const closeBtn = document.getElementById('close-principal');

    if (trigger && modal) {
        trigger.addEventListener('click', () => {
            modal.classList.add('active');
        });

        const closeModal = () => modal.classList.remove('active');
        
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});

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
    // Helper Promise for Papa.parse
    function parseCSV(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: false,
                complete: function(results) { resolve(results.data); },
                error: reject
            });
        });
    }

    // Global Commentary Cache
    window.subjectDetailsDB = {};

    function processComments(rawData) {
        window.subjectDetailsDB = {}; // Reset
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length < 2) continue;
            const name = row[1].trim();
            if (name) {
                window.subjectDetailsDB[name] = {
                    overview: row[2] ? row[2].trim() : "",
                    teacher: row[3] ? row[3].trim() : ""
                };
            }
        }
        console.log("Processed comments DB:", window.subjectDetailsDB);
    }

    function fetchData(year) {
        const csvUrl = typeof INTEGRATED_CURRICULUM_URL !== 'undefined' && INTEGRATED_CURRICULUM_URL.trim() !== '' 
            ? INTEGRATED_CURRICULUM_URL 
            : (typeof CSV_URLS !== 'undefined' ? CSV_URLS[year] : '');
        const commentsUrl = typeof COMMENTS_URL !== 'undefined' ? COMMENTS_URL : '';

        if (!csvUrl) {
            console.error("Unknown year:", year);
            return;
        }
        
        loader.classList.remove('hidden');
        guideSection.classList.add('hidden');
        curriculumSection.classList.add('hidden');
        subjectsContainer.innerHTML = '';
        
        const promises = [parseCSV(csvUrl)];
        if (commentsUrl && commentsUrl.trim() !== '') {
            promises.push(parseCSV(commentsUrl));
        }

        Promise.all(promises).then(([curriculumData, commentsData]) => {
            if (commentsData) {
                processComments(commentsData);
            }
            processData(curriculumData, year);
        }).catch(err => {
            console.error("Error loading CSV datasets:", err);
            loader.innerHTML = `<p style="color:red"><i class="ph ph-warning"></i> 데이터를 불러오는데 실패했습니다.</p>`;
        });
    }

    function processData(rawData, selectedYear) {
        let isSheetFormat = false; // Old Google Sheet index offset format
        let isNewFormat = false;   // New Simplified Sheet (12 cols)

        // 1. Detect format
        if (rawData.length > 0 && rawData[0] && rawData[0][5] && rawData[0][5].trim() === "학점") {
            isNewFormat = true;
            console.log("Detected Simplified New Format dataset");
        } else if (rawData.length > 5 && rawData[4] && rawData[4][0] && rawData[4][0].trim() === "교과(군)") {
            isSheetFormat = true;
            console.log("Detected Google Sheet index offset format");
        } else {
            console.log("Detected Local CSV format dataset");
        }

        const processed = [];
        let currentSubjectGroup = "";
        let currentGradeSelectSemester = null;
        let currentGradeSelectRule = "";
        let currentGradeSelectGroupId = "";
        let gradeSelectGroupCounter = 0;
        let currentNewFormatRule = ""; // Support cell merged carries for New layout

        // 2. Adjust offsets based on format
        let startIdx = 1;
        let catCol = 1;
        let nameCol = 2;
        let creditColOffset = 13;

        if (isNewFormat) {
            startIdx = 1;
            catCol = 1;
            nameCol = 2;
            creditColOffset = 6;
        } else if (isSheetFormat) {
            startIdx = 7;
            catCol = 0;
            nameCol = 1;
            creditColOffset = 12;
        }

        const semesters = [
            { grade: 1, term: 1, col: creditColOffset },
            { grade: 1, term: 2, col: creditColOffset + 1 },
            { grade: 2, term: 1, col: creditColOffset + 2 },
            { grade: 2, term: 2, col: creditColOffset + 3 },
            { grade: 3, term: 1, col: creditColOffset + 4 },
            { grade: 3, term: 2, col: creditColOffset + 5 }
        ];

        for (let i = startIdx; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length < 3) continue;

            if (!isSheetFormat) {
                const rowYear = row[0] ? row[0].trim() : "";
                if (rowYear !== String(selectedYear)) continue; 
            }

            if (row[catCol] && row[catCol].trim() !== "") {
                let group = row[catCol].trim().replace(/\n/g, "");
                if (group.includes("사회(역사/도덕 포함)")) group = "사회";
                currentSubjectGroup = group;
            }

            const subjectName = row[nameCol] ? row[nameCol].trim() : "";
            if (!subjectName || subjectName === "자율・자치 활동" || subjectName === "동아리 활동" || subjectName === "진로 활동" ||
                (row[catCol] && row[catCol].includes("창의적\n 체험활동"))) {
                continue; 
            }

            let type = "일반";
            if (isNewFormat) {
                type = row[3] ? row[3].trim() : "일반";
            } else {
                if (row[5] === "○") type = "공통";
                else if (row[6] === "○") type = "일반선택";
                else if (row[7] === "○") type = "진로선택";
                else if (row[8] === "○") type = "융합선택";
            }
            
            let rule = "";
            if (isNewFormat) {
                const rowRule = row[4] ? row[4].trim() : "";
                if (rowRule !== "") {
                    currentNewFormatRule = rowRule;
                    gradeSelectGroupCounter++;
                    currentGradeSelectGroupId = `group_id_new_${gradeSelectGroupCounter}`;
                }
                rule = currentNewFormatRule;
            } else {
                const ruleCol1 = isSheetFormat ? 11 : 10;
                if (row[ruleCol1] && row[ruleCol1].trim() !== "") rule = row[ruleCol1].trim();
                else if (row[11] && row[11].trim() !== "") rule = row[11].trim();
            }

            const isGradeSelect = !isNewFormat && row[4] === "○"; 

            if (isGradeSelect) {
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
                    gradeSelectGroupCounter++;
                    currentGradeSelectGroupId = `group_id_${gradeSelectGroupCounter}`;
                }

                const individualCredit = row[19] ? row[19].trim().replace(/[^0-9]/g, '') : "";

                if (currentGradeSelectSemester && individualCredit) {
                    processed.push({
                        category: currentSubjectGroup,
                        name: subjectName,
                        type: type,
                        rule: currentGradeSelectRule || "선택",
                        groupId: currentGradeSelectGroupId,
                        credit: individualCredit,
                        grade: currentGradeSelectSemester.grade,
                        term: currentGradeSelectSemester.term,
                        rawDetails: row
                    });
                }
            } else {
                semesters.forEach(sem => {
                    const cellValue = row[sem.col] ? row[sem.col].trim() : "";
                    if (cellValue !== "") {
                        let finalCredit = cellValue.replace(/[^0-9]/g, '');
                        if (isNewFormat && (cellValue === "○" || cellValue === "o")) {
                            finalCredit = row[5] ? row[5].trim().replace(/[^0-9]/g, '') : "";
                        }
                        
                        processed.push({
                            category: currentSubjectGroup,
                            name: subjectName,
                            type: type,
                            rule: isNewFormat ? (rule !== "" ? rule : "필수이수") : (rule !== "" ? rule : (cellValue.includes("택") ? cellValue : "필수이수")),
                            credit: finalCredit,
                            grade: sem.grade,
                            term: sem.term,
                            groupId: isNewFormat ? currentGradeSelectGroupId : "",
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
        subjects.forEach(s => {
            let r = s.rule;
            if (!r) r = "기타";
            
            if (r.includes("필수")) r = "필수이수";
            
            // Use groupId to avoid merging separate selection blocks using same name (e.g., 택3)
            const groupKey = s.groupId || r;
            
            if (!ruleGroups[groupKey]) ruleGroups[groupKey] = [];
            ruleGroups[groupKey].push(s);
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
            ${sortedRules.map(groupKey => {
                const groupSubjects = ruleGroups[groupKey];
                const actualRuleName = groupSubjects[0].rule; // Get actual rule name from first subject
                const isMandatory = actualRuleName === '필수이수';
                
                // Parse friendly rule names. e.g. "택1(2)" -> "1과목 선택 (2학점)"
                let friendlyRuleName = actualRuleName;
                const match = actualRuleName.match(/택(\d+)\((\d+)\)/);
                if (match) {
                    friendlyRuleName = `${match[1]}과목 선택 (${match[2]}학점)`;
                } else if (actualRuleName.includes('택1')) {
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
        
        // Fetch description data from sub-sheet cache if it exists
        const details = window.subjectDetailsDB ? window.subjectDetailsDB[subjectInfo.name] : null;
        if (details) {
            document.getElementById('modal-official-desc').innerText = details.overview || "과목 개요 정보가 없습니다.";
            document.getElementById('modal-teacher-comment').innerText = details.teacher || "담당 교사 코멘트가 없습니다.";
        } else {
            // Fallback placeholder/defaults
            document.getElementById('modal-teacher-comment').innerHTML = `
                ${subjectInfo.name} 과목에 대한 담당 선생님의 코멘트가 보여질 영역입니다.<br>
                <span style="color:var(--text-muted); font-size:0.85em;">(현재 연동 대기 중 - 별도 배포되는 교사 입력 시트에서 가져올 예정)</span>
            `;
            document.getElementById('modal-official-desc').innerText = `2022 개정 교육과정 ${subjectInfo.category} 교과(군)에 해당하는 과목입니다.`;
        }

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

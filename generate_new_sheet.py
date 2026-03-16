import csv

input_path = '교육과정_편제표_통합.csv'
output_path = '교육과정_편제표_새양식.csv'

with open(input_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

new_rows = []
# 12 columns
new_rows.append(['입학년도', '교과군', '과목명', '과목유형', '선택규칙', '학점', '1-1학기', '1-2학기', '2-1학기', '2-2학기', '3-1학기', '3-2학기'])

current_group = ""
# Grade select state machine matching script.js
current_g_semester = None
current_g_rule = ""

for i in range(1, len(rows)):
    row = rows[i]
    if len(row) < 3: continue
    
    year = row[0].strip() if row[0] else ""
    if year not in ["2025", "2026"]: continue # Filter by standard years
    
    if len(row) > 1 and row[1].strip():
        group = row[1].strip().replace('\n', '')
        if "사회(역사/도덕 포함)" in group:
            group = "사회"
        current_group = group
        
    subject = row[2].strip() if len(row) > 2 else ""
    if not subject or subject in ["자율・자치 활동", "동아리 활동", "진로 활동"]:
        continue
        
    # Get Type
    typ = "일반"
    if len(row) > 5 and row[5] == "○": typ = "공통"
    elif len(row) > 6 and row[6] == "○": typ = "일반선택"
    elif len(row) > 7 and row[7] == "○": typ = "진로선택"
    elif len(row) > 8 and row[8] == "○": typ = "융합선택"
    
    # Get Rule
    rule = ""
    if len(row) > 10 and row[10].strip(): rule = row[10].strip()
    elif len(row) > 11 and row[11].strip(): rule = row[11].strip()
    
    # Semesters matching script.js 13-18
    semesters = [
        { 'grade': 1, 'term': 1, 'col': 13 },
        { 'grade': 1, 'term': 2, 'col': 14 },
        { 'grade': 2, 'term': 1, 'col': 15 },
        { 'grade': 2, 'term': 2, 'col': 16 },
        { 'grade': 3, 'term': 1, 'col': 17 },
        { 'grade': 3, 'term': 2, 'col': 18 }
    ]
    
    is_grade_select = len(row) > 4 and row[4] == "○"
    
    if is_grade_select:
        found_sem = None
        for sm in semesters:
            val = row[sm['col']].strip() if len(row) > sm['col'] else ""
            if val:
                found_sem = { 'g': sm['grade'], 't': sm['term'] }
        
        if found_sem:
            current_g_semester = found_sem
        if rule:
            current_g_rule = rule
            
        individual_credit = ""
        if len(row) > 19:
            individual_credit = "".join(filter(str.isdigit, row[19].strip()))
            
        if current_g_semester and individual_credit:
            g = current_g_semester['g']
            t = current_g_semester['t']
            rule_text = current_g_rule if current_g_rule else "선택"
            
            new_row = [year, current_group, subject, typ, rule_text, individual_credit]
            sem_boxes = [""] * 6
            idx = (g-1) * 2 + (t - 1)
            sem_boxes[idx] = "○"
            new_row.extend(sem_boxes)
            new_rows.append(new_row)
            
    else:
        # Standard row
        credit = ""
        sem_boxes = [""] * 6
        for sm_idx, sm in enumerate(semesters):
            val = row[sm['col']].strip() if len(row) > sm['col'] else ""
            if val:
                credit = "".join(filter(str.isdigit, val))
                sem_boxes[sm_idx] = "○"
                
        if credit: # Has some semester taught
            new_row = [year, current_group, subject, typ, rule, credit]
            new_row.extend(sem_boxes)
            new_rows.append(new_row)

# Deduplicate identical rows (e.g., if multiple semesters are printed grouped weirdly later)
unique_rows = []
seen = set()
unique_rows.append(new_rows[0]) # headers

for r in new_rows[1:]:
    # Create key based on (year, group, subject, type, rule, credit)
    key = tuple(r[:6])
    if key not in seen:
        seen.add(key)
        unique_rows.append(r)
    else:
        # Update semester boxes of previous row
        # Find index of existing row
        for i, ur in enumerate(unique_rows):
            if tuple(ur[:6]) == key:
                for j in range(6, 12):
                    if r[j] == "○":
                        unique_rows[i][j] = "○"
                break

with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(unique_rows)

print(f"Created new layout CSV with {len(unique_rows) - 1} data rows.")

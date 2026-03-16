import csv

csv_path = '교육과정_편제표_통합.csv'
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

processed = []
current_subject_group = ""
# script.js indices
semesters = [
    { 'grade': 1, 'term': 1, 'col': 13 },
    { 'grade': 1, 'term': 2, 'col': 14 },
    { 'grade': 2, 'term': 1, 'col': 15 },
    { 'grade': 2, 'term': 2, 'col': 16 },
    { 'grade': 3, 'term': 1, 'col': 17 },
    { 'grade': 3, 'term': 2, 'col': 18 }
]

for i in range(1, len(rows)):
    row = rows[i]
    if len(row) < 3:
        continue
    
    row_year = row[0].strip() if row[0] else ""
    if row_year != "2026": # Test for 2026
        continue
        
    if not row[2] or row[2].strip() == "":
        continue
        
    if row[1] and row[1].strip() != "":
        group = row[1].strip().replace('\n', '')
        if "사회(역사/도덕 포함)" in group:
            group = "사회"
        current_subject_group = group
        
    subject_name = row[2].strip()
    
    type_str = "일반"
    if len(row) > 5 and row[5] == "○": type_str = "공통"
    elif len(row) > 6 and row[6] == "○": type_str = "일반선택"
    elif len(row) > 7 and row[7] == "○": type_str = "진로선택"
    elif len(row) > 8 and row[8] == "○": type_str = "융합선택"
    
    rule = ""
    if len(row) > 10 and row[10].strip() != "": rule = row[10].strip()
    elif len(row) > 11 and row[11].strip() != "": rule = row[11].strip()
    
    # Check regular row
    for sem in semesters:
        col = sem['col']
        if col < len(row):
            cell_value = row[col].strip()
            if cell_value != "":
                 processed.append({
                     'category': current_subject_group,
                     'name': subject_name,
                     'type': type_str,
                     'rule': rule if rule != "" else ( "택" if "택" in cell_value else "필수이수" ),
                     'credit': cell_value,
                     'grade': sem['grade'],
                     'term': sem['term']
                 })

print(f"=== Total Processed Items for 2026: {len(processed)} ===")
for item in processed:
    print(f"[{item['category']}] {item['name']} - {item['grade']}학년 {item['term']}학기 ({item['credit']}학점, {item['rule']})")

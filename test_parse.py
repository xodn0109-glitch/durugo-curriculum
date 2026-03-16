import urllib.request
import csv
import io

URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQow_gZ1AI0kCVtU-HIUZsRDQv9V--MQJKWCaK2aipsxF-F6cUTe7CER3aJXKrvuGbDa2pJF2miV85f/pub?output=csv'

def parse():
    response = urllib.request.urlopen(URL)
    data = response.read().decode('utf-8')
    f = io.StringIO(data)
    reader = csv.reader(f)
    rows = list(reader)

    processed = []
    currentSubjectGroup = ""
    currentGradeSelectSemester = None
    currentGradeSelectRule = ""

    # Iterate starting from row 7 (0-indexed)
    for i in range(7, len(rows)):
        row = rows[i]
        if i >= len(rows) or not row[1] or row[1].strip() == "":
            continue

        if row[0] and row[0].strip() != "":
            currentSubjectGroup = row[0].strip().replace('\n', '')

        subjectName = row[1].strip()
        isGradeSelect = row[3] == "○"

        rule = ""
        if len(row) > 9 and row[9] and row[9].strip() != "":
            rule = row[9].strip()
        elif len(row) > 10 and row[10] and row[10].strip() != "":
            rule = row[10].strip()

        semesters = [
            {'grade': 1, 'term': 1, 'col': 12},
            {'grade': 1, 'term': 2, 'col': 13},
            {'grade': 2, 'term': 1, 'col': 14},
            {'grade': 2, 'term': 2, 'col': 15},
            {'grade': 3, 'term': 1, 'col': 16},
            {'grade': 3, 'term': 2, 'col': 17}
        ]

        if isGradeSelect:
            foundSemester = None
            for sem in semesters:
                if len(row) > sem['col'] and row[sem['col']] and row[sem['col']].strip() != "":
                    foundSemester = {'grade': sem['grade'], 'term': sem['term']}

            if foundSemester:
                currentGradeSelectSemester = foundSemester
            if rule:
                currentGradeSelectRule = rule

            if currentGradeSelectSemester:
                processed.append({
                    'category': currentSubjectGroup,
                    'name': subjectName,
                    'rule': currentGradeSelectRule if currentGradeSelectRule else "선택",
                    'grade': currentGradeSelectSemester['grade']
                })

    print("=== 3학년 선택과목 ===")
    for s in processed:
        if s['grade'] == 3:
            print(f"[{s['category']}] {s['name']} - Rule: {s['rule']}")

parse()

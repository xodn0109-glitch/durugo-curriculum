import csv

csv_path = '교육과정_편제표_통합.csv'
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Find row 55 (or whatever contains 주제 탐구 독서)
target_row = None
for r in rows:
    if len(r) > 2 and '주제 탐구 독서' in r[2]:
        target_row = r
        break

if target_row:
    print("=== Target Row Details ===")
    for i, v in enumerate(target_row):
        print(f"{i}: {v.strip()}")
else:
    print("Row not found")

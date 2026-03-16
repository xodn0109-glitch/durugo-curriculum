import csv

csv_path = '교육과정_편제표_통합.csv'
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

headers = rows[0]
print("=== CSV Headers ===")
for i, h in enumerate(headers):
    print(f"{i}: {h.strip()}")

print("\n=== First Data Row ===")
if len(rows) > 1:
    for i, v in enumerate(rows[1]):
        print(f"{i}: {v.strip()}")
else:
    print("No data rows found.")

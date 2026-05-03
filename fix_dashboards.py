import os

replacements = {
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c': b'\xe2\x80\x94',  # â€" -> —
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x93': b'\xe2\x80\x94',  # â€" variant -> —
    b'\xc3\xa2\xe2\x82\xac\xc2\xa6': b'\xe2\x80\xa6',       # â€¦ -> …
    b'\xc3\xa2\xe2\x82\xac\xe2\x84\xa2': b'\xe2\x80\x99',   # â€™ -> '
    b'Manage \xc3\xa2\xe2\x80\xa0\xe2\x80\x99': b'Manage \xe2\x86\x92',       # Manage â†' -> Manage →
    b'View all \xc3\xa2\xe2\x80\xa0\xe2\x80\x99': b'View all \xe2\x86\x92',   # View all â†' -> View all →
    b'\xc3\xa2\xe2\x80\xa0\xe2\x80\x99': b'\xe2\x86\x92',   # â†' -> →
    b'\xc3\xa2\xe2\x82\xac\xc2\xb1': b'\xe2\x82\xb1',       # â‚± -> ₱  
}

files = [
    'views/dc-dashboard.html',
    'views/manager-dashboard.html',
    'views/admin-dashboard.html',
]

for f in files:
    fp = os.path.join(os.path.dirname(__file__), f)
    if not os.path.exists(fp):
        print(f"SKIP: {f} not found")
        continue
    with open(fp, 'rb') as fh:
        data = fh.read()
    original = data
    for old, new in replacements.items():
        data = data.replace(old, new)
    if data != original:
        with open(fp, 'wb') as fh:
            fh.write(data)
        print(f"FIXED: {f}")
    else:
        print(f"OK: {f} (no changes needed)")

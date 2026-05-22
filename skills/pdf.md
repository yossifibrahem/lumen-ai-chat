---
name: pdf uploads
description: view this skill to understand how to handle uploaded pdf files
---

# PDF

**Never** `cat` a PDF — it prints binary garbage.
**Never** `view` a PDF — it prints binary garbage.

Quick first move — get the page count and check if text is extractable:

```bash
pdfinfo /mnt/user-data/uploads/report.pdf
pdftotext -f 1 -l 1 /mnt/user-data/uploads/report.pdf - | head -20
```

Then peek at the text content:

```python
from pypdf import PdfReader
r = PdfReader("/mnt/user-data/uploads/report.pdf")
print(f"{len(r.pages)} pages")
print(r.pages[0].extract_text()[:2000])
```
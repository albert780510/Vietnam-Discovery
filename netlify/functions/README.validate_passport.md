# validate_passport (MRZ OCR)

This function accepts a `multipart/form-data` POST with field `file` (passport bio page image).

It performs:
- basic type/size checks
- image preprocessing (crop bottom area)
- OCR via tesseract.js
- MRZ existence check (two long lines with `<`)

Response:
```json
{ "ok": true, "mrzLines": ["...", "..."], "warnings": [] }
```
or
```json
{ "ok": false, "reason": "MRZ_NOT_FOUND", "message": "..." }
```

Privacy: should not store files; function processes in-memory.

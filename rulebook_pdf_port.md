

# Claude Code Execution Rulebook
## PDF Generation Triggers + Port Migration + S3 Integration

> Read CLAUDE.md and FILES_INDEX.md fully before executing anything.
> Execute every rule in exact order listed.
> Show a diff after each rule before moving to the next.
> Stop and ask if anything in the repo doesn't match what's described.
> Do NOT make any change not explicitly described in this rulebook.

---

## PRE-FLIGHT — Read These Files First

```
main.py
app/api/api.py
app/api/routes/s3.py                      ← NEW (IT provided)
app/api/routes/pdf.py
app/api/routes/health_pdf.py
app/api/routes/motor_pdf.py
app/api/routes/email.py
app/api/routes/health_email.py
app/api/routes/motor_email.py
app/api/routes/whatsapp.py                ← NEW (IT provided)
app/api/routes/zepto_email.py             ← NEW (IT provided)
app/services/s3_service.py                ← NEW (IT provided)
app/api/endpoints/term.py
app/templates/term_report_email.py        ← read to understand build_term_report_html()
src/services/termApi.ts
src/context/TermProtectionCheckContext.tsx
src/components/steps/TermStrengtheningStep.tsx
src/components/steps/TermRecommendationStep.tsx
vite.config.ts
.env or .env.local
requirements.txt
```

Understand before touching anything:
- How `build_term_report_html()` works in `term_report_email.py`
- What template functions exist for Health and Motor (equivalent of `build_term_report_html`)
- What `PdfReportRequest` looks like in `app/api/routes/pdf.py`
- How `s3_service.upload_pdf(pdf_bytes, filename)` returns `(url, error)`
- How `zepto_email.py` takes `pdf_url` to attach PDF — it fetches from S3
- How `whatsapp.py` takes `file_url` to send document — it reads from S3
- Whether `app/api/routes/s3.py` and `app/services/s3_service.py` are
  already registered in `main.py` or `app/api/api.py`

---

## PART A — PDF GENERATION TRIGGERS
### Scope: Frontend only. No backend changes in this part.
### Note: Until Part C is complete, calling downloadTermPdf at Step 3
### will trigger a browser download dialog. Part C fixes this.

---

### RULE A1 — TERM: Background PDF on "See My Protection Summary"

**Status: ALREADY EXECUTED — diff confirmed in previous session.**

Summary of what was done:
- Added `downloadTermPdf` import to `TermStrengtheningStep.tsx`
- Captured `pdfPayload` before `finally` block using `let pdfPayload = null`
- Built payload in both `try` (API success) and `catch` (fallback) paths
- In `finally`: fires `downloadTermPdf(pdfPayload).catch(...)` non-blocking before `onComplete()`

**Do not re-execute. Verify it is already in place and move to A2.**

---

### RULE A2 — TERM: Remove Auto PDF Trigger from Step 5

**File:** `src/components/steps/TermRecommendationStep.tsx`

Find any `useEffect` that calls `downloadTermPdf()` or any PDF
generation on component mount. Remove it entirely.

Do NOT remove:
- Download button (user-triggered)
- Email button
- Share / WhatsApp button
- Any display logic, score rings, panels, or text

---

### RULE A3 — HEALTH: Auto-Fire PDF After AI Analysis Completes

Find the Health Insurance component or context file where the AI
analysis API response is handled and report data is set into state.

Look for the pattern where `setHealthReport(data)` or equivalent
state setter is called after a successful API response.

Add a ref guard + background PDF call immediately after:

```typescript
const healthPdfFiredRef = useRef(false)

// Inside the API success handler, after setting report state:
if (!healthPdfFiredRef.current) {
  healthPdfFiredRef.current = true
  generateHealthPdf({ /* all report data fields */ })
    .catch(err => console.error("Health PDF background generation failed:", err))
}
```

Where `generateHealthPdf` calls `POST /api/s3/generate-and-upload`
with the health report payload. If this function doesn't exist in
the Health API client file, create it following the same pattern
as `downloadTermPdf` in `termApi.ts`.

Rules:
- Non-blocking — do NOT await
- Ref guard prevents double-firing on re-render
- No loading state, no UI change

---

### RULE A4 — MOTOR: Auto-Fire PDF After AI Analysis Completes

Apply the exact same treatment as Rule A3 to the Motor tool.

```typescript
const motorPdfFiredRef = useRef(false)

if (!motorPdfFiredRef.current) {
  motorPdfFiredRef.current = true
  generateMotorPdf({ /* all report data fields */ })
    .catch(err => console.error("Motor PDF background generation failed:", err))
}
```

---

### PART A Verification

| # | Test | Expected |
|---|------|----------|
| 1 | Click "Continue" on Term Step 3 | User advances immediately, PDF fires in background |
| 2 | Network tab after Step 3 | POST to `/api/term/generate-pdf` or `/api/s3/generate-and-upload` visible |
| 3 | Health analysis completes | PDF fires automatically, no UI change |
| 4 | Motor analysis completes | PDF fires automatically, no UI change |
| 5 | Refresh Health/Motor component | PDF does NOT fire again (ref guard working) |
| 6 | All download/email/share buttons | Work exactly as before |

---

## PART B — PORT REFERENCES
### Scope: Replace hardcoded ports with environment variables.
### Do NOT change actual port values — IT handles that on the server.

---

### RULE B1 — Run Grep First, Show Full Output Before Any Changes

```bash
grep -rn "8000" . \
  --include="*.py" --include="*.ts" --include="*.tsx" \
  --include="*.env" --include="*.json" \
  --exclude-dir=".git" --exclude-dir="node_modules"

grep -rn "8080" . \
  --include="*.py" --include="*.ts" --include="*.tsx" \
  --include="*.env" --include="*.json" \
  --exclude-dir=".git" --exclude-dir="node_modules"

grep -rn "localhost" . \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="node_modules"
```

Show full output. Do not change any file until confirmed.

---

### RULE B2 — Update `main.py`

Find:
```python
uvicorn.run(app, host="0.0.0.0", port=8000)
```

Replace with:
```python
import os
port = int(os.getenv("PORT", 8000))
uvicorn.run(app, host="0.0.0.0", port=port)
```

Find CORS `allow_origins`. Replace with:
```python
allow_origins=[
    os.getenv("FRONTEND_URL", "http://localhost:8080"),
    "http://localhost:5173",
    "http://localhost:8080",
]
```

Also verify `app/api/routes/s3.py` and `app/api/routes/whatsapp.py`
and `app/api/routes/zepto_email.py` are registered in the router.
If not, add them to `app/api/api.py`:
```python
from app.api.routes import s3, whatsapp, zepto_email
api_router.include_router(s3.router)
api_router.include_router(whatsapp.router)
api_router.include_router(zepto_email.router)
```

---

### RULE B3 — Update `src/services/termApi.ts`

Replace all hardcoded `http://localhost:8000` with
`import.meta.env.VITE_API_URL` in every fetch call.

---

### RULE B4 — Update Health and Motor API Client Files

Apply same `import.meta.env.VITE_API_URL` replacement to every
hardcoded URL in Health and Motor frontend API client files.

---

### RULE B5 — Update `vite.config.ts`

```typescript
server: {
  port: Number(process.env.VITE_PORT) || 8080,
  strictPort: false,
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

---

### RULE B6 — Update `.env`

Ensure these exist:
```
VITE_API_URL=http://localhost:8000
PORT=8000
FRONTEND_URL=http://localhost:8080
```

---

### RULE B7 — Check All Backend Route Files

Check these for hardcoded URLs and replace with `os.getenv()` if found:
```
app/api/routes/pdf.py
app/api/routes/health_pdf.py
app/api/routes/motor_pdf.py
app/api/routes/email.py
app/api/routes/health_email.py
app/api/routes/motor_email.py
app/api/routes/s3.py
app/api/routes/zepto_email.py
app/api/routes/whatsapp.py
app/api/endpoints/term.py
app/api/api.py
```

---

### RULE B8 — Final Verification Grep

Re-run grep from B1. Zero hardcoded `localhost:8000` or
`localhost:8080` must remain in `.ts`, `.tsx`, or `.py` source files.

---

## PART C — S3 PDF STORAGE
### Scope: Backend + Frontend. Uses IT's provided files.
### This replaces the StreamingResponse blob-download flow entirely.

---

### RULE C1 — Verify `.env` Has All Required S3 Variables

Ensure these are present in `.env`:
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=
S3_CLOUD_URL=
GUPSHUP_USERID=
GUPSHUP_PASSWORD=
```

Do not commit actual credential values. Confirm keys exist, values
will be filled by IT on the server.

---

### RULE C2 — Verify S3 Router is Registered

**File:** `app/api/api.py`

Confirm `s3.router` is included. If not already done in B2, add:
```python
from app.api.routes.s3 import router as s3_router
api_router.include_router(s3_router)
```

Confirm the router prefix is `/api/s3` — this is set in `s3.py`
already via `prefix="/api/s3"`.

---

### RULE C3 — Create Health and Motor S3 Endpoints

**Context:** `app/api/routes/s3.py` currently has
`/api/s3/generate-and-upload` only for Term
(uses `build_term_report_html` + `PdfReportRequest`).

Health and Motor need equivalent endpoints in the same file.

**Find the HTML builder functions for Health and Motor:**
Look in `app/templates/` for files equivalent to `term_report_email.py`.
They will have functions like `build_health_report_html()` and
`build_motor_report_html()`. Identify the exact function names and
their request payload shapes before writing these endpoints.

**Add to `app/api/routes/s3.py`:**

```python
from app.templates.health_report_email import build_health_report_html
from app.templates.motor_report_email import build_motor_report_html

# Add the appropriate Pydantic request models for Health and Motor
# by checking what fields build_health_report_html() and
# build_motor_report_html() expect. Mirror the pattern of PdfReportRequest.

@router.post("/generate-and-upload-health", response_model=S3UploadResponse)
async def generate_and_upload_health_pdf(payload: HealthPdfReportRequest):
    try:
        html_content = build_health_report_html(payload.dict())
        pdf_bytes = HTML(string=html_content).write_pdf()
        unique_id = str(uuid.uuid4().hex)[:8]
        filename = f"Health_Audit_{payload.customer_name or 'Report'}_{unique_id}.pdf".replace(" ", "_")
        url, error = s3_service.upload_pdf(pdf_bytes, filename)
        if url:
            return S3UploadResponse(success=True, url=url)
        return S3UploadResponse(success=False, message=error or "Upload failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-and-upload-motor", response_model=S3UploadResponse)
async def generate_and_upload_motor_pdf(payload: MotorPdfReportRequest):
    try:
        html_content = build_motor_report_html(payload.dict())
        pdf_bytes = HTML(string=html_content).write_pdf()
        unique_id = str(uuid.uuid4().hex)[:8]
        filename = f"Motor_Audit_{payload.customer_name or 'Report'}_{unique_id}.pdf".replace(" ", "_")
        url, error = s3_service.upload_pdf(pdf_bytes, filename)
        if url:
            return S3UploadResponse(success=True, url=url)
        return S3UploadResponse(success=False, message=error or "Upload failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### RULE C4 — Store S3 URL in Context State (Term)

**File:** `src/context/TermProtectionCheckContext.tsx`

Add to `TermProtectionState`:
```typescript
reportUrl: string | null      // S3 URL returned after PDF generation
reportFilename: string | null
```

Add defaults:
```typescript
reportUrl: null,
reportFilename: null,
```

Add setter:
```typescript
setReportUrl: (url: string, filename: string) => void
```

Implement:
```typescript
const setReportUrl = (url: string, filename: string) =>
  setState(prev => ({ ...prev, reportUrl: url, reportFilename: filename }))
```

Expose in provider value object.

> ⚠️ BUMP STORAGE_VERSION to "1.5" in `termScoringConstants.ts`
> State shape has changed — stale localStorage must be cleared.

---

### RULE C5 — Update Term PDF Call to Use S3 Endpoint

**File:** `src/services/termApi.ts`

Replace `downloadTermPdf()` with a new function `generateAndUploadTermPdf()`
that calls `/api/s3/generate-and-upload` and returns the S3 URL:

```typescript
/**
 * Generates Term PDF and uploads to S3.
 * Returns { url, success } — does NOT trigger a browser download.
 * Called non-blocking from TermStrengtheningStep on "Continue".
 */
export async function generateAndUploadTermPdf(payload: {
  customer_name: string
  score: number
  ideal_cover: number
  your_cover: number
  shortfall: number
  coverage_status: string
  mode: string
  score_reasons: string[]
  insurer_reliability_score: number
  riders_present: string[]
  missing_riders: string[]
}): Promise<{ success: boolean; url?: string; message?: string }> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/s3/generate-and-upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) throw new Error("PDF generation failed")
  return res.json()
}
```

Keep the old `downloadTermPdf()` temporarily — it may still be
referenced elsewhere. Mark it as deprecated with a comment.

---

### RULE C6 — Update Term Step 3 to Use New S3 Function

**File:** `src/components/steps/TermStrengtheningStep.tsx`

Find the Rule A1 change (non-blocking `downloadTermPdf` call in `finally`).

Replace `downloadTermPdf` with `generateAndUploadTermPdf`:

```typescript
// BEFORE (Rule A1):
downloadTermPdf(pdfPayload)
  .catch(err => console.error("Background PDF generation failed:", err));

// AFTER (Rule C6):
generateAndUploadTermPdf(pdfPayload)
  .then(result => {
    if (result.success && result.url) {
      setReportUrl(result.url, pdfPayload.customer_name + "_report.pdf")
    }
  })
  .catch(err => console.error("Background S3 PDF generation failed:", err));
```

Import `generateAndUploadTermPdf` and `useTermProtection`'s
`setReportUrl` as needed.

---

### RULE C7 — Update Health and Motor Frontend to Use S3 Endpoints

**Health API client file:**
Add `generateAndUploadHealthPdf()` calling `/api/s3/generate-and-upload-health`.
Same return shape as Rule C5.

**Motor API client file:**
Add `generateAndUploadMotorPdf()` calling `/api/s3/generate-and-upload-motor`.
Same return shape as Rule C5.

Update Rules A3 and A4 call sites to use these new functions
and store the returned URL in their respective context states.

---

### RULE C8 — Update Email to Use S3 URL (All 3 Tools)

**Context:** `zepto_email.py` already accepts `pdf_url` and downloads
the PDF from S3 to attach it. The frontend just needs to pass the
stored S3 URL when calling the email endpoint.

**Term — `src/components/steps/TermRecommendationStep.tsx`:**

Find the email button handler. Update it to pass `reportUrl` from context:
```typescript
const { reportUrl, customerName } = useTermProtection()

// Email handler:
await fetch(`${import.meta.env.VITE_API_URL}/api/email/send-zepto-report`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to_email: userEmail,
    customer_name: customerName,
    pdf_url: reportUrl,   // S3 URL — zepto_email.py fetches PDF from here
  }),
})
```

Apply same pattern to Health and Motor email handlers.

---

### RULE C9 — Update WhatsApp Share to Use S3 URL (All 3 Tools)

**Context:** `whatsapp.py` accepts `file_url` — must be a publicly
accessible URL. S3 `S3_CLOUD_URL` URLs are public, so this works directly.

**Term — WhatsApp share handler in `TermRecommendationStep.tsx`:**
```typescript
await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/send-document`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mobile: userPhone,
    file_url: reportUrl,    // S3 URL
    name: customerName,
    filename: "Insurance_Review_Report",
  }),
})
```

Apply same pattern to Health and Motor WhatsApp handlers.

---

### RULE C10 — Update Download Button to Use S3 URL (All 3 Tools)

The Download button no longer needs to call the backend.
It just opens the S3 URL directly:

```typescript
const handleDownload = () => {
  if (!reportUrl) return
  const a = document.createElement("a")
  a.href = reportUrl
  a.download = reportFilename || "Insurance_Report.pdf"
  a.target = "_blank"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

Apply to Term, Health, and Motor final report pages.

---

### RULE C11 — Remove Old StreamingResponse PDF Routes

Once all three tools are confirmed working with S3, mark the old
routes as deprecated. Do NOT delete them yet — keep them commented
out until UAT sign-off.

Files to comment out (do not delete):
```
app/api/routes/pdf.py          → comment out StreamingResponse return
app/api/routes/health_pdf.py   → comment out StreamingResponse return
app/api/routes/motor_pdf.py    → comment out StreamingResponse return
```

Add a comment above each:
```python
# DEPRECATED — replaced by /api/s3/generate-and-upload in s3.py
# Kept for rollback safety until UAT sign-off
```

---

### PART C Verification

| # | Test | Expected |
|---|------|----------|
| 1 | Complete Term flow to Step 3, click Continue | No browser download dialog. PDF uploads to S3 silently. |
| 2 | Check S3 bucket | File appears at `sss-campaign/Term_Audit_{name}_{id}.pdf` |
| 3 | Reach Term Step 5, click Download | Opens/downloads PDF from S3 URL |
| 4 | Click Email on Step 5 | Email received with PDF attached (fetched from S3 by zepto_email.py) |
| 5 | Click WhatsApp on Step 5 | WhatsApp message received with PDF document |
| 6 | Complete Health flow | PDF auto-generated and uploaded to S3 |
| 7 | Complete Motor flow | PDF auto-generated and uploaded to S3 |
| 8 | Check `.env` | All S3 keys present, no credentials hardcoded in source |

---

## ALL FILES MODIFIED BY THIS RULEBOOK

| File | Part | Change |
|------|------|--------|
| `src/components/steps/TermStrengtheningStep.tsx` | A+C | PDF trigger on Continue; updated to S3 function |
| `src/components/steps/TermRecommendationStep.tsx` | A+C | Remove auto-gen; email/WhatsApp/download use S3 URL |
| Health analysis component | A+C | Auto PDF trigger; email/WhatsApp/download use S3 URL |
| Motor analysis component | A+C | Auto PDF trigger; email/WhatsApp/download use S3 URL |
| `main.py` | B+C | Port via env var; register new routers |
| `app/api/api.py` | B+C | Register s3, whatsapp, zepto_email routers |
| `src/services/termApi.ts` | B+C | Env var URLs; add `generateAndUploadTermPdf()` |
| Health API client file | B+C | Env var URLs; add `generateAndUploadHealthPdf()` |
| Motor API client file | B+C | Env var URLs; add `generateAndUploadMotorPdf()` |
| `app/api/routes/s3.py` | C | Add health + motor generate-and-upload endpoints |
| `src/context/TermProtectionCheckContext.tsx` | C | Add `reportUrl`, `reportFilename` state + setter |
| `src/constants/termScoringConstants.ts` | C | Bump STORAGE_VERSION to "1.5" |
| `vite.config.ts` | B | Port via env var |
| `.env` | B+C | All env vars present |
| `app/api/routes/pdf.py` | C | Deprecated comment added |
| `app/api/routes/health_pdf.py` | C | Deprecated comment added |
| `app/api/routes/motor_pdf.py` | C | Deprecated comment added |

## FILES NOT TOUCHED

| File | Reason |
|------|--------|
| `app/services/s3_service.py` | IT provided — use as-is |
| `app/api/routes/whatsapp.py` | IT provided — use as-is |
| `app/api/routes/zepto_email.py` | IT provided — use as-is |
| `app/core/rules/term_rules.py` | Not affected |
| All scoring engines | Not affected |
| `src/constants/termRiders.ts` | Not affected |

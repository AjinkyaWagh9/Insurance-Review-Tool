# Insurance Review Tool — Claude Code Context

> Read this fully before touching any file in this repo.

---

## Project Overview

AI-powered insurance policy analyzer for the Indian market (Bajaj Capital).
Users fill a questionnaire, upload their policy PDF, and receive a scored analysis with coverage gap recommendations delivered via email or WhatsApp.

**Three tools:**
- **Health Insurance Analyzer** — coverage gap scoring with ICR, restoration, room rent, co-pay analysis
- **Motor Insurance Analyzer** — IDV gap + add-on completeness scoring
- **Term Insurance Analyzer** — DIME-based ideal cover calculation with insurer reliability scoring

---

## Repo Structure

```
Insurance Review Tool/
├── backend/
│   ├── main.py                          # FastAPI bootstrap, CORS, router registration
│   ├── insurance_tool.db                # SQLite database
│   └── app/
│       ├── api/
│       │   ├── api.py                   # Central router aggregator
│       │   ├── endpoints/
│       │   │   ├── analyze.py           # POST /api/v1/analyze (health + motor PDF analysis)
│       │   │   ├── health.py            # Health-specific endpoints
│       │   │   ├── lead.py              # Lead capture
│       │   │   ├── main.py              # Health/motor routing
│       │   │   ├── motor.py             # Motor-specific endpoints
│       │   │   ├── term.py              # Term endpoints (score, upload, send-report, rules)
│       │   │   └── utils.py             # Utility functions
│       │   └── routes/
│       │       ├── s3.py                # [ACTIVE] S3 PDF generation + upload (preferred)
│       │       ├── whatsapp.py          # [ACTIVE] Gupshup WhatsApp document delivery
│       │       ├── zepto_email.py       # [ACTIVE] ZeptoMail SMTP email delivery
│       │       ├── health_email.py      # [ACTIVE] Health report email
│       │       ├── motor_email.py       # [ACTIVE] Motor report email
│       │       ├── pdf.py               # [DEPRECATED] Term PDF streaming
│       │       ├── health_pdf.py        # [DEPRECATED] Health PDF streaming
│       │       └── motor_pdf.py         # [DEPRECATED] Motor PDF streaming
│       ├── core/rules/
│       │   ├── term_rules.py            # DIME scoring constants — MUST match frontend
│       │   ├── health_rules.py          # Health scoring logic
│       │   └── motor_rules.py           # Motor IDV/add-on evaluation
│       ├── db/session.py                # SQLAlchemy DB init
│       ├── models/                      # SQLAlchemy ORM models
│       ├── schemas/                     # Pydantic request/response schemas
│       ├── templates/                   # HTML templates for PDF rendering
│       ├── prompts/                     # LLM prompt templates
│       └── services/
│           └── s3_service.py            # S3Service class (boto3, singleton)
└── frontend/
    ├── vite.config.ts                   # Dev server + proxy config
    └── src/
        ├── constants/
        │   └── termScoringConstants.ts  # AUTHORITATIVE scoring constants + STORAGE_VERSION
        ├── context/
        │   ├── ProtectionCheckContext.tsx      # Health state (no persistence)
        │   ├── TermProtectionCheckContext.tsx  # Term state (localStorage + version migration)
        │   └── MotorProtectionCheckContext.tsx # Motor state (no persistence)
        ├── services/
        │   ├── healthApi.ts             # Health API client
        │   ├── motorApi.ts              # Motor API client
        │   ├── termApi.ts               # Term API client + dev utilities
        │   └── leadApi.ts               # Lead capture + CRM integration
        └── components/forms/
            ├── HealthReportStep.tsx
            ├── MotorRecommendationStep.tsx
            ├── TermBasicInfoStep.tsx
            ├── TermRecommendationStep.tsx
            └── TermStrengtheningStep.tsx
```

---

## Ports & Environment

| Service  | Port | Config                            |
|----------|------|-----------------------------------|
| Frontend | 8080 | `vite.config.ts` (`VITE_PORT`)   |
| Backend  | 8000 | `main.py` (`PORT` env var)       |

Vite proxies all `/api/*` → `VITE_API_URL || http://localhost:8000`

### Backend `.env`
```
PORT=8000
FRONTEND_URL=http://localhost:8080

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=
S3_CLOUD_URL=                    # CloudFront URL prefix

# WhatsApp (Gupshup)
GUPSHUP_USERID=
GUPSHUP_PASSWORD=

DATABASE_URL=sqlite:///./insurance_tool.db
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:8000
VITE_PORT=8080
```

**Never hardcode URLs or ports in source files.** Use `import.meta.env.VITE_API_URL` in frontend and `os.getenv()` in backend.

---

## API Endpoints

### Core Analysis
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/v1/leads/` | Lead capture (store in DB) |
| POST | `/api/v1/analyze` | Health + Motor PDF analysis (multipart FormData) |
| POST | `/api/term/score` | Term scoring calculation |
| POST | `/api/term/upload-policy` | Term PDF upload + extraction + score |
| POST | `/api/term/send-report` | Email term report |
| GET  | `/api/term/rules` | Dev: validate frontend constants against backend |

### S3 PDF Generation (ACTIVE — Preferred Pattern)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/s3/upload-pdf` | Upload pre-generated PDF file |
| POST | `/api/s3/generate-and-upload` | Generate Term PDF → S3 → return URL |
| POST | `/api/s3/generate-and-upload-health` | Generate Health PDF → S3 → return URL |
| POST | `/api/s3/generate-and-upload-motor` | Generate Motor PDF → S3 → return URL |

### Delivery
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/email/send-zepto-report` | ZeptoMail SMTP (downloads PDF from S3, emails it) |
| POST | `/api/whatsapp/send-document` | Gupshup WhatsApp document (S3 URL → customer) |
| POST | `/api/health/send-report` | Health email delivery |
| POST | `/api/motor/send-report` | Motor email delivery |

### Deprecated (StreamingResponse — do not use for new code)
| Method | Route |
|--------|-------|
| POST | `/api/term/generate-pdf` |
| POST | `/api/health/generate-pdf` |
| POST | `/api/motor/generate-pdf` |

---

## PDF Generation Pattern (Critical)

**NEVER stream PDFs directly to the browser.**

```
Frontend → POST /api/s3/generate-and-upload-{type}
         → Backend: WeasyPrint generates PDF bytes
         → Backend: S3Service uploads to s3://bucket/insurance-review-tool/{filename}
         → Backend: returns { success, url }   ← CloudFront URL
         → Frontend: stores url in context state
         → User: download / email / WhatsApp all use this S3 URL
```

**S3 Path:** `insurance-review-tool/{filename}`
**Filename format:** `{Type}_Audit_{customer_name}_{uuid8}.pdf`
e.g. `Term_Audit_Ajinkya_a1b2c3d4.pdf`

---

## External Service Config

### S3 (s3_service.py)
- Bucket: `S3_BUCKET_NAME` env var
- Region: `ap-south-1`
- CDN: `S3_CLOUD_URL` env var (CloudFront)
- Content-Type: `application/pdf`, Cache-Control: `no-store`
- Singleton: `s3_service = S3Service()` at module level

### WhatsApp (whatsapp.py — Gupshup)
- Two-step: OPT-IN phone → SEND DOCUMENT with S3 URL
- Credentials: `GUPSHUP_USERID`, `GUPSHUP_PASSWORD` env vars
- Phone normalization: strips/adds `91` country code prefix

### Email (zepto_email.py — ZeptoMail)
- SMTP Host: `smtp.zeptomail.in:587` (TLS)
- Username: `emailappsmtp.1ce934d7c87681af`
- From: `noreply@bajajcapital.com`
- Process: downloads PDF from S3 URL → attaches → sends
- Password: `SMTP_PASSWORD` env var (currently partially hardcoded — move to env)

### Lead CRM (leadApi.ts)
- Internal DB: `POST /api/v1/leads/`
- External CRM: `http://localhost:8087/bclcomapp/api/insuranceCRMLead`

---

## State Management

### Health — `ProtectionCheckContext.tsx`
- No persistence (session only)
- Key fields: `extractedPolicy`, `preferences` (city, age, familyType, members, roomPreference), `mode`, `policyFile`
- Flow: upload PDF → fill preferences → `computeReport()` → `POST /api/v1/analyze`

### Term — `TermProtectionCheckContext.tsx`
- **localStorage persistence** under key `"termProtectionData"`
- **STORAGE_VERSION** guards against stale cached state
- Version history: 1.0 → 1.1 → 1.2 → 1.3 → 1.4 → **1.5** (current)
- Key fields: `age`, `annualIncome`, `dependents`, `existingSumAssured`, `loanAmount`, `monthlyExpenses`, `retirementAge`, `familySecureYears`, `mode` ("estimate" | "verified"), `reportUrl`, `reportFilename`
- Computed: `activeIdeal`, `activeShortfall` switch on `mode`
- Uses `useRef` to prevent stale closures in async callbacks

### Motor — `MotorProtectionCheckContext.tsx`
- No persistence (session only)
- Key fields: `marketValue`, `currentIdv`, `idealIdv`, `extractedPolicy`, `backendPolicy`
- Flow: fill info → upload PDF → `POST /api/v1/analyze` → render recommendations

---

## Critical Rules — Never Break

### Rule A — STORAGE_VERSION
- Declared ONLY in `src/constants/termScoringConstants.ts`
- Current value: `"1.5"`
- **Must bump** when: `TermProtectionState` shape changes, scoring constants change, or backend scoring changes
- If stale, users see wrong calculations silently from localStorage

### Rule B — Scoring Constants Sync
`termScoringConstants.ts` `TERM_SCORING_CONSTANTS` **must mirror** `backend/app/core/rules/term_rules.py` `TERM_SCORING_CONFIG`:
```
INCOME_MULTIPLIER:   10    (10× annual income)
DEPENDENT_BUFFER:    5000000  (₹50L per dependent)
EXPENSE_YEARS_BUFFER: 2   (2 years monthly expenses)
```

### Rule C — Rider Matching
- All rider matching via `computeMissingRiders()` in `termRiders.ts`
- Never write inline rider matching in components

### Rule D — API URLs
- Frontend: always `import.meta.env.VITE_API_URL`
- Backend: always `os.getenv()`
- Never hardcode localhost or port numbers

### Rule E — WeasyPrint macOS Fix
`motor_pdf.py` and `s3.py` include a library path fix for Homebrew libraries on macOS — do not remove:
```python
if sys.platform == "darwin":
    lib_path = "/opt/homebrew/lib"
    os.environ["DYLD_LIBRARY_PATH"] = ...
```

---

## Key Algorithms

### DIME Ideal Cover (Term)
```
ideal_cover = (annual_income × 10)
            + outstanding_loans
            + (dependents × 50,00,000)
            + (monthly_expenses × 12 × 2)
            − existing_savings
```

### Motor Score (Penalty Model, starts at 100)
```
−40  if liability_only (no comprehensive)
−20  if voluntary deductible > 0
−20  if zero_dep missing AND vehicle ≤ 3 yrs
−10  if zero_dep missing AND vehicle 4–7 yrs
−5   if zero_dep missing AND vehicle > 7 yrs
−20  if engine_protect missing AND flood-prone city
−10  if engine_protect missing AND other city
−10  if RTI missing AND vehicle ≤ 3 yrs
−5   if tyre_protect missing (eligible vehicles)
−15  if IDV gap > 5%
−3   per AI-detected financial risk
floor: 10
```

### Health Score (Additive, 0–100)
```
claim_settlement_ratio : −10 → +10
sum_insured            : +10 → +30
restoration_benefit    : +2  → +8
room_rent_limit        : +5  → +15
co_pay                 : −5  → +10
sub_limits             : −10 → +15
ped_waiting_period     : −5  → +15
geographic_coverage    : −5  → +5
```

### Score Labels (all 3 tools)
```
≥ 75  → Strong Coverage
≥ 50  → Needs Attention
< 50  → Critical Gaps
```

---

## Key Request/Response Shapes

### POST `/api/v1/analyze` (Health + Motor)
```typescript
// Request: multipart FormData
{ file: File, city: string, marketValue?: number }

// Health Response: ExtractedPolicyData
{
  insurer_name, plan_name, policy_number, sum_insured, premium,
  room_rent_limit, copay_percentage, deductible, sub_limits[],
  waiting_periods: { initial_days, ped_months, specific_months },
  restoration_present, restoration_type, ncb_percentage, ncb_max_percentage,
  zone_of_cover, has_zonal_copay, global_health_coverage,
  is_family_floater, members_covered,
  instant_cover, instant_cover_conditions[], ped_effective_months,
  policy_score, score_label, icr_value, icr_rating,
  comparison_rows[], recommendations[], verdict, verdict_reason, ideal_cover
}
```

### POST `/api/term/score`
```typescript
// Request
{
  age, income, child_count, extracted_sum_assured, loans,
  monthly_expenses, retirement_age, family_secure_years,
  savings, detected_riders[], insurer_name, customer_name?
}

// Response
{
  score, score_reasons[], ideal_cover, coverage_ratio, coverage_status,
  insurer_reliability_score, insurer_reliability_data,
  ideal_cover_breakdown: {
    income_protection, loans, dependent_buffer,
    expense_buffer, savings_deducted, multiplier_used
  }
}
```

### POST `/api/s3/generate-and-upload` (and health/motor variants)
```typescript
// Response
{ success: boolean, url?: string, message?: string }
```

### POST `/api/email/send-zepto-report`
```typescript
{ to_email: string, customer_name: string, pdf_url: string }
```

### POST `/api/whatsapp/send-document`
```typescript
{ mobile: string, file_url: string, name: string, filename?: string }
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python) |
| PDF generation | WeasyPrint (HTML → PDF) |
| PDF parsing | pdfplumber |
| LLM | OpenAI GPT-4o (AsyncOpenAI) |
| Storage | AWS S3 + CloudFront (boto3) |
| Database | SQLite via SQLAlchemy |
| Email | ZeptoMail SMTP |
| WhatsApp | Gupshup Gateway API |
| Frontend state | React Context + localStorage (Term only) |

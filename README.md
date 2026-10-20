# CyberShield — Advanced Fraud Intelligence Platform (BTech Edition)

A full-stack, 3-layer cyber threat intelligence system for detecting fraudulent job, internship, and placement offers.

---

## Architecture Overview

```
cybershield/
├── frontend/                  (Next.js 16 + Tailwind CSS + Lucide Icons)
│   ├── app/
│   │   ├── page.tsx           → Upload & multi-input inspection portal
│   │   ├── result/[id]/page.tsx → Visual Risk Gauge, breakdown & evidence
│   │   └── report/page.tsx    → Student community threat registry
│   └── components/            (RiskGauge, EvidenceList, UploadBox, Navbar)
│
└── backend/                   (FastAPI + Uvicorn)
    ├── main.py                → API routes & SlowAPI rate limiting
    ├── extract.py             → pdfplumber + OCR text extraction
    ├── redact.py              → Automated PII redaction (Aadhaar, Phone, Accounts)
    ├── letter_check.py        → Regex heuristic rules + Claude API semantic validation
    ├── company_check.py       → RDAP domain age, DNS MX/SPF, RapidFuzz brand lookalike
    ├── reports.py             → Supabase Postgres (pg_trgm) + local fallback
    ├── scoring.py             → Explainable 0-100 score engine with safety overrides
    └── tests/                 → Pytest test suite (100% pass)
```

---

## 3-Engine Detection Pipeline

1. **Letter Check (45% Weight)**:
   - Evaluates upfront payment demands, pressure tactics, skip-interview guarantees, and credential harvesting.
   - Claude API contextual integration for semantic clause analysis.

2. **Company & Domain Intel (35% Weight)**:
   - RDAP lookup for newly registered domains (<60 days = High Risk).
   - DNS MX / SPF security record validation.
   - RapidFuzz & confusable homoglyph brand typosquatting detector across 24+ top enterprise employers (Google, Microsoft, Infosys, TCS, Amazon, etc.).

3. **Student Peer Reports (20% Weight)**:
   - Crowdsourced community intelligence with deduplication and unverified labeling.

**Hard Security Override**: Upfront fee demands or 3+ independent peer complaints automatically elevate the risk score to `>= 75 (High Scam Risk)`.

---

## Running Locally

### 1. Backend (FastAPI)
```powershell
cd cybershield\backend
py -m pip install -r requirements.txt  # (or pip install fastapi uvicorn httpx pdfplumber dnspython rapidfuzz tldextract confusable_homoglyphs slowapi pytest)
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- API Documentation: `http://127.0.0.1:8000/docs`

### 2. Frontend (Next.js)
```powershell
cd cybershield\frontend
npm run dev
```
- Web Application: `http://localhost:3000`

### 3. Running Automated Tests
```powershell
cd cybershield\backend
py -m pytest -v
```

---

## Environment Variables (Optional)
Create `.env` inside `backend/`:
```env
ANTHROPIC_API_KEY="your-anthropic-key"
SAFE_BROWSING_KEY="your-google-safe-browsing-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
```
*(If keys are not configured, the system gracefully operates offline using deterministic rules and local SQLite storage)*

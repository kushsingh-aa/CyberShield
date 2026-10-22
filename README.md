# CyberShield — Offer Fraud Intelligence

A full-stack tool that helps students check internship and job offers for scam signals. Paste an offer, upload a document or screenshot, or enter recruiter details, and CyberShield returns an explainable 0–100 risk score with the evidence behind it and next steps.

> CyberShield is a heuristic estimate, not a legal verdict. False positives and false negatives are possible.

---

## Architecture

```
CyberShield/
├── frontend/                 Next.js 16 + React 19 + Tailwind CSS 4 (light & dark themes)
│   ├── app/
│   │   ├── page.tsx              Overview: inspect an offer, live risk dashboard
│   │   ├── result/[id]/page.tsx  Full report with highlighted red-flag phrases
│   │   ├── history/page.tsx      Past checks with search and risk filters
│   │   ├── report/page.tsx       Community scam reports
│   │   └── system/page.tsx       How the scoring works
│   ├── components/           Charts, score card, evidence list, theme toggle
│   └── lib/                  API client types, theme bootstrap
│
└── backend/                  FastAPI + Uvicorn
    ├── main.py               API routes, CORS, rate limiting
    ├── extract.py            Text from PDF / DOCX / TXT / images (pdfplumber, pypdf, RapidOCR)
    ├── redact.py             PII redaction (Aadhaar, phone, account numbers)
    ├── letter_check.py       Regex rules + optional AI analysis (Gemini, OpenRouter or Claude)
    ├── company_check.py      Domain age (RDAP), MX/SPF, TLS validity, lookalike domains, threat feeds
    ├── reports.py            Community reports (SQLite, or Supabase if configured)
    ├── store.py              Persisted check results and history
    ├── scoring.py            Weighted score + safety overrides
    └── tests/                Pytest suite (network calls mocked where it matters)
```

## How scoring works

```
score = round(0.45 × Letter + 0.35 × Company + 0.20 × Reports)
```

| Engine | Signals |
|---|---|
| **Letter (45%)** | Upfront fees, UPI/QR payment requests, urgency, guaranteed selection, OTP/PIN requests, original-certificate demands, Telegram/WhatsApp recruiting, task-based earning schemes, remote-access software, free-mail recruiters. Optional AI analysis adds semantic signals. |
| **Company & domain (35%)** | Domain under 60/180 days old, missing MX/SPF records, invalid HTTPS certificate, brand lookalike/homoglyph domains, raw-IP or plain-HTTP links, Google Safe Browsing and VirusTotal hits. |
| **Community reports (20%)** | Prior reports from independent reporters. |

**Overrides:** an upfront payment demand, or reports from 3+ independent reporters, raises the score to at least 75.
**Levels:** 0–29 lower risk · 30–59 caution · 60–100 high concern.

Rule-based hits record the exact phrases that triggered them, which the report page highlights in the document.

---

## Running locally

Requirements: **Python 3.12** and **Node.js 20.9+**.

### Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                # optional: add API keys
uvicorn main:app --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:3000. If the backend runs elsewhere, set `NEXT_PUBLIC_API` in `frontend/.env.local`.

### With Docker

```bash
docker compose up --build
```

Starts the backend on port 8000 and the frontend on port 3000. Check data is kept in the `cybershield-data` volume.

### Tests

```powershell
cd backend
python -m pytest -v
```

Tests use a temporary database and never touch `cybershield_local.db`. CI (`.github/workflows/ci.yml`) runs the tests plus the frontend type check, lint and production build on every push.

---

## Configuration (`backend/.env`, all optional)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini for AI analysis |
| `OPENROUTER_API_KEY` | OpenRouter (keys start with `sk-or-v1-`) |
| `ANTHROPIC_API_KEY` | Anthropic Claude (`claude-opus-5-5`) |
| `SAFE_BROWSING_KEY` | Google Safe Browsing URL checks |
| `VIRUSTOTAL_API_KEY` | VirusTotal URL reputation |
| `SUPABASE_URL`, `SUPABASE_KEY` | Store community reports in Supabase instead of SQLite |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API (default: localhost:3000) |
| `REPORT_SALT` | Secret for hashing reporter identities; **set this in production** |
| `CYBERSHIELD_DB_PATH` | Location of the SQLite database |

Without any keys the app runs fully offline-capable on the rule engine and local SQLite.

Users can also paste their own AI key in the app. It is used for that single request only and is never stored on the server.

---

## Security notes

- **Community reports:** reporter identity is a salted hash of IP address + user agent, derived on the server. Each reporter can flag a given company or domain once, and submissions are rate limited (5/minute, 30/day). This raises the bar for abuse but cannot stop someone using several networks; treat the 3-report override as a community signal, not proof.
- **CORS** only allows the configured frontend origins.
- **Known advisory:** `npm audit` reports a high-severity `braces` advisory (GHSA-vfj7-8cjw-p6xm) through `eslint-config-next`. It affects lint tooling only, not the shipped app, and every `braces` version is listed as affected; the suggested `npm audit fix --force` downgrades `eslint-config-next` to v14 and is not recommended.

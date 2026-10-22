import asyncio
import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from extract import extract_text
from redact import redact
from letter_check import analyze_letter
from company_check import check_company
from reports import find_reports, save_report, LOCAL_DB_PATH
from scoring import build_score
from store import save_check, get_check, list_checks, check_stats
import sqlite3

# Centralized config directory
CONFIG_DIR = Path(__file__).resolve().parent / "config"

def _load_json(filename: str):
    """Loads a JSON config file from the config directory."""
    filepath = CONFIG_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="CyberShield Fraud Intelligence Engine", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration for Next.js frontend. Only the listed origins may call the API;
# no cookies are used, so credentials stay disabled.
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load demo presets from external config file
DEMO_CASES: dict = _load_json("demo_cases.json")

# Load report pattern types from external config file
REPORT_PATTERNS: list = _load_json("report_patterns.json")

# Salt for hashing reporter identities; set REPORT_SALT in production
REPORT_SALT = os.getenv("REPORT_SALT", "cybershield-local-salt")

def reporter_fingerprint(request: Request) -> str:
    """Derives a stable, non-reversible reporter id from the client IP and user agent.

    The client cannot choose this value, so one person cannot pose as several
    "independent" reporters just by changing a field in the request body.
    """
    ip = get_remote_address(request) or "unknown"
    ua = request.headers.get("user-agent", "")
    digest = hashlib.sha256(f"{REPORT_SALT}|{ip}|{ua}".encode()).hexdigest()[:16]
    return f"fp_{digest}"

@app.get("/")
async def root():
    return {
        "engine": "CyberShield Fraud Intelligence Engine",
        "version": "2.0.0",
        "status": "online",
        "endpoints": ["/api/check", "/api/report", "/api/reports", "/api/stats", "/api/demo/{case}", "/api/result/{id}"]
    }

@app.get("/api/ai-status")
async def ai_status():
    openrouter_key = bool(os.getenv("OPENROUTER_API_KEY") or (os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY").startswith("sk-or-v1-")))
    gemini_key = bool(os.getenv("GEMINI_API_KEY") and not os.getenv("GEMINI_API_KEY").startswith("sk-"))
    anthropic_key = bool(os.getenv("ANTHROPIC_API_KEY"))
    provider = "OpenRouter AI" if openrouter_key else "Google Gemini" if gemini_key else "Anthropic Claude" if anthropic_key else None
    ai_available = openrouter_key or gemini_key or anthropic_key
    return {
        "ai_available": ai_available,
        "provider": provider,
        "mode": "Zero-Dataset AI Semantic Engine" if ai_available else "Local Fallback",
        "gemini_configured": gemini_key,
        "openrouter_configured": openrouter_key,
        "anthropic_configured": anthropic_key
    }

@app.post("/api/check")
@limiter.limit("40/minute")
async def check_offer(
    request: Request,
    document: Optional[UploadFile] = File(None),
    text: str = Form(""),
    company: str = Form(""),
    sender: str = Form(""),
    url: str = Form(""),
    api_key: Optional[str] = Form(None)
):
    # The user's key is passed down for this request only; it is never stored in os.environ
    key = (api_key or request.headers.get("x-gemini-key") or request.headers.get("x-api-key") or "").strip() or None

    pasted_text = (text or "").strip()
    doc_text = ""
    doc_name = None
    if document and document.filename:
        doc_name = document.filename
        doc_text = (await extract_text(document)).strip()

    if pasted_text and doc_text:
        extracted_text = pasted_text + "\n\n" + doc_text
    elif doc_text:
        extracted_text = doc_text
    else:
        extracted_text = pasted_text

    if not extracted_text.strip() and not (company or sender or url):
        if document and document.filename:
            raise HTTPException(
                status_code=400,
                detail="The uploaded document could not be read as text (it may be a scanned image or empty). Please paste the offer text or provide recruiter details."
            )
        raise HTTPException(status_code=400, detail="Provide offer letter document, text, company name, sender, or link.")

    # Step 1: PII Redaction
    sanitized_text = redact(extracted_text)

    # Step 2: Parallel execution of 3 intelligence checks
    letter_task = analyze_letter(sanitized_text, api_key=key)
    company_task = check_company(company=company, sender=sender, url=url)
    reports_task = find_reports(company=company, sender=sender, url=url)

    letter_res, comp_res, rep_res = await asyncio.gather(letter_task, company_task, reports_task)

    # Step 3: Weighted Scoring & Evidence compilation
    scored = build_score(letter_res, comp_res, rep_res)

    check_id = str(uuid.uuid4())[:8]
    result_payload = {
        "id": check_id,
        "company": company or comp_res.get("domain") or "Unspecified Entity",
        "sender": sender,
        "url": url,
        "document_name": doc_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sanitized_preview": sanitized_text[:1200],
        **scored
    }

    # Persist so result permalinks survive backend restarts
    save_check(result_payload)

    return result_payload

@app.get("/api/result/{check_id}")
async def get_check_result(check_id: str):
    result = get_check(check_id)
    if not result:
        raise HTTPException(status_code=404, detail="Check result expired or not found")
    return result

@app.get("/api/history")
async def get_history(limit: int = 50):
    """Recent real checks (demo runs excluded), newest first."""
    return list_checks(max(1, min(limit, 200)))

@app.get("/api/demo/{case}")
async def run_demo(case: str):
    if case not in DEMO_CASES:
        raise HTTPException(status_code=404, detail=f"Invalid demo case. Options: {list(DEMO_CASES.keys())}")
    d = DEMO_CASES[case]
    sanitized_text = redact(d["text"])
    letter_res, comp_res, rep_res = await asyncio.gather(
        analyze_letter(sanitized_text),
        check_company(company=d["company"], sender=d["sender"], url=d["url"]),
        find_reports(company=d["company"], sender=d["sender"], url=d["url"])
    )
    scored = build_score(letter_res, comp_res, rep_res)
    check_id = f"demo-{case}"
    payload = {
        "id": check_id,
        "demo_label": d["label"],
        "company": d["company"],
        "sender": d["sender"],
        "url": d["url"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sanitized_preview": sanitized_text,
        **scored
    }
    save_check(payload, is_demo=True)
    return payload

@app.get("/api/patterns")
async def get_report_patterns():
    """Returns dynamic scam pattern categories loaded from configuration."""
    return REPORT_PATTERNS

@app.get("/api/demo-cases")
async def get_demo_cases():
    """Returns available demo cases loaded from configuration."""
    return [
        {
            "key": k,
            "label": v.get("label", k),
            "company": v.get("company", ""),
            "sender": v.get("sender", ""),
            "url": v.get("url", "")
        }
        for k, v in DEMO_CASES.items()
    ]

@app.post("/api/report")
@limiter.limit("5/minute;30/day")
async def submit_report(request: Request):
    data = await request.json()
    company = (data.get("company") or "").strip()[:120]
    domain = (data.get("domain") or "").strip()[:200]
    pattern = (data.get("pattern") or "").strip()[:120]
    details = (data.get("details") or "").strip()[:2000]

    if not company or not pattern:
        raise HTTPException(status_code=400, detail="Company name and scam pattern are required.")

    # Any client-supplied user_id is ignored; identity comes from the request itself
    res = await save_report(
        company=company, domain=domain, pattern=pattern, details=redact(details),
        user_id=reporter_fingerprint(request)
    )
    if res.get("duplicate"):
        raise HTTPException(status_code=409, detail="You have already reported this company or domain.")
    return {
        "ok": True,
        "message": "Report recorded as UNVERIFIED student intelligence.",
        "status": "unverified",
        "data": res
    }

@app.get("/api/reports")
async def list_reports():
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, company, domain, pattern, details, status, created_at FROM student_reports ORDER BY id DESC LIMIT 25"
        ).fetchall()
        return [dict(r) for r in rows]

@app.get("/api/stats")
async def get_stats():
    reports_count = 0
    try:
        with sqlite3.connect(LOCAL_DB_PATH) as conn:
            reports_count = conn.execute("SELECT COUNT(*) FROM student_reports").fetchone()[0]
    except Exception:
        pass

    # Each real check is stored exactly once in the checks table, so nothing is double-counted
    return {**check_stats(), "community_reports": reports_count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

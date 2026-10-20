import os
import sqlite3
from datetime import datetime, timezone
import logging
from rapidfuzz import fuzz

logger = logging.getLogger("reports")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "cybershield_local.db")

def init_local_db():
    """Initializes local SQLite database for development / offline environments."""
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS student_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                company TEXT,
                domain TEXT,
                pattern TEXT,
                details TEXT,
                status TEXT DEFAULT 'unverified',
                created_at TEXT
            )
        """)
init_local_db()

async def find_reports(company: str = "", sender: str = "", url: str = "") -> dict:
    """
    Looks up student threat reports using domain exact match or fuzzy company matching.
    Supports Supabase PostgreSQL (with pg_trgm) if credentials exist, falling back to local SQLite.
    """
    domain = ""
    if url:
        domain = url.split("//")[-1].split("/")[0].lower()
    elif sender and "@" in sender:
        domain = sender.rsplit("@", 1)[-1].lower()

    company_clean = (company or "").strip().lower()
    reports = []
    
    # 1. Supabase Postgres check
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            # Query by domain
            if domain:
                res = supabase.table("reports").select("id, user_id, company, domain, pattern, status").eq("domain", domain).execute()
                reports.extend(res.data or [])
            # Also query company name if available
            if company_clean:
                res_comp = supabase.table("reports").select("id, user_id, company, domain, pattern, status").ilike("company", f"%{company_clean}%").execute()
                for r in res_comp.data or []:
                    if r["id"] not in [x["id"] for x in reports]:
                        reports.append(r)
        except Exception as e:
            logger.warning(f"Supabase query failed, falling back to local database: {e}")

    # 2. Local fallback if Supabase not configured or returned nothing
    if not reports:
        with sqlite3.connect(LOCAL_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT id, user_id, company, domain, pattern, status FROM student_reports").fetchall()
            for row in rows:
                r_dict = dict(row)
                r_domain = (r_dict.get("domain") or "").lower()
                r_comp = (r_dict.get("company") or "").lower()
                
                # Match condition: domain match or rapidfuzz match >= 75
                matched = False
                if domain and r_domain and domain == r_domain:
                    matched = True
                elif company_clean and r_comp:
                    if fuzz.token_sort_ratio(company_clean, r_comp) >= 75:
                        matched = True
                
                if matched:
                    reports.append(r_dict)

    # Calculate independent reporting users
    unique_users = set()
    for r in reports:
        uid = r.get("user_id") or f"anon_{r.get('id')}"
        unique_users.add(uid)
    independent_count = len(unique_users)

    evidence = []
    if independent_count > 0:
        pts = min(40, independent_count * 15)
        evidence.append({
            "source": "Student Community Reports",
            "key": "student_reports_alert",
            "points": pts,
            "title": f"{independent_count} Prior Student Scam Report(s)",
            "detail": f"This entity or domain has been flagged by {independent_count} independent student(s). All reports are logged as UNVERIFIED community intelligence.",
            "advice": "Review peer warning patterns before engaging or submitting documents."
        })

    return {
        "independent_reports": independent_count,
        "raw_reports": reports[:10],
        "evidence": evidence
    }

async def save_report(company: str, domain: str, pattern: str, details: str, user_id: str = "anonymous") -> dict:
    """Saves a new student fraud report to Supabase or local SQLite."""
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Try Supabase if configured
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            data = {
                "user_id": user_id,
                "company": company,
                "domain": domain,
                "pattern": pattern,
                "details": details,
                "status": "unverified",
                "created_at": now_iso
            }
            res = supabase.table("reports").insert(data).execute()
            return {"ok": True, "source": "supabase", "data": res.data}
        except Exception as e:
            logger.warning(f"Supabase insert failed: {e}")

    # Local SQLite
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        conn.execute(
            "INSERT INTO student_reports (user_id, company, domain, pattern, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, company, domain, pattern, details, "unverified", now_iso)
        )
    return {"ok": True, "source": "local", "status": "unverified"}

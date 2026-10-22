import asyncio
import os

import pytest
from fastapi.testclient import TestClient

import company_check
import letter_check
import store
from main import app
from reports import find_reports
from scoring import build_score

client = TestClient(app)


# ---------- Scoring boundaries (mirrors thresholds in scoring.py) ----------

def _score(letter_pts=0, comp_pts=0):
    letter = {"evidence": [{"points": letter_pts}] if letter_pts else [], "fees": False}
    comp = {"evidence": [{"points": comp_pts}] if comp_pts else []}
    return build_score(letter, comp, {"independent_reports": 0})


@pytest.mark.parametrize(
    "letter_pts, comp_pts, expected_score, expected_level",
    [
        (65, 0, 29, "low"),       # 0.45 * 65 = 29.25
        (66, 0, 30, "caution"),   # 0.45 * 66 = 29.7 -> 30
        (100, 41, 59, "caution"), # 45 + 14.35
        (100, 42, 60, "high"),    # 45 + 14.7 -> 60
    ],
)
def test_score_level_boundaries(letter_pts, comp_pts, expected_score, expected_level):
    out = _score(letter_pts, comp_pts)
    assert out["score"] == expected_score
    assert out["level"] == expected_level


def test_three_independent_reports_force_high():
    out = build_score({"evidence": [], "fees": False}, {"evidence": []}, {"independent_reports": 3, "evidence": []})
    assert out["score"] >= 75 and out["level"] == "high"


# ---------- Letter rules ----------

@pytest.mark.parametrize(
    "text, key, fee",
    [
        ("Please pay the onboarding amount via UPI to confirm.", "upi_payment", True),
        ("Scan the QR code to block your seat.", "upi_payment", True),
        ("Join our Telegram group t.me/hiring123 for the interview.", "informal_channel", False),
        ("Earn Rs 3,000 per day by rating products. Simple tasks to earn!", "task_scam", False),
        ("Install AnyDesk so HR can check your laptop.", "remote_access", False),
    ],
)
def test_new_scam_rules(text, key, fee):
    res = letter_check.run_regex_rules(text)
    assert any(e["key"] == key for e in res["evidence"])
    assert res["fees_demanded"] is fee


def test_legitimate_offer_has_no_rule_hits():
    text = "Dear Priya Sharma, following your two interview rounds we are pleased to offer you the role. Your stipend will be credited to your bank account monthly."
    assert letter_check.run_regex_rules(text)["evidence"] == []


def test_rule_evidence_includes_matched_phrases():
    res = letter_check.run_regex_rules("Pay a refundable deposit of Rs 2,999 within 24 hours.")
    fee = next(e for e in res["evidence"] if e["key"] == "upfront_fee")
    assert any("deposit" in m.lower() for m in fee["matches"])


# ---------- AI output validation & key handling ----------

def test_ai_output_validation():
    good = letter_check._parse_findings('```json\n{"fees_demanded": true, "confidence": 0.8}\n```')
    assert good["fees_demanded"] is True and good["suspicious_clauses"] == []
    assert letter_check._parse_findings("not json at all") is None
    assert letter_check._parse_findings('{"fees_demanded": "maybe"}') is None


def test_provider_routing_by_key_prefix():
    assert letter_check._provider_for_key("sk-or-v1-abc") is letter_check._openrouter_check
    assert letter_check._provider_for_key("sk-ant-abc") is letter_check._claude_check
    assert letter_check._provider_for_key("AIzaSyabc") is letter_check._gemini_check


def test_user_api_key_is_not_leaked_into_environment(monkeypatch):
    seen = {}

    async def fake_gemini(text, key):
        seen["key"] = key
        return None

    monkeypatch.setattr(letter_check, "_gemini_check", fake_gemini)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    r = client.post("/api/check", data={"text": "Hello candidate", "api_key": "AIza-user-secret"})
    assert r.status_code == 200
    assert seen["key"] == "AIza-user-secret"
    assert os.environ.get("GEMINI_API_KEY") != "AIza-user-secret"


# ---------- Persistence, stats & history ----------

def test_results_persist_and_stats_count_once():
    before = client.get("/api/stats").json()["total_checks"]

    r = client.post("/api/check", data={"text": "Pay a registration fee of 1500 immediately.", "company": "Persist Corp"})
    check_id = r.json()["id"]

    assert store.get_check(check_id)["company"] == "Persist Corp"
    assert client.get(f"/api/result/{check_id}").status_code == 200
    assert client.get("/api/stats").json()["total_checks"] == before + 1


def test_demo_runs_excluded_from_stats_and_history():
    before = client.get("/api/stats").json()["total_checks"]
    client.get("/api/demo/safer")
    assert client.get("/api/stats").json()["total_checks"] == before
    assert all(not h["id"].startswith("demo-") for h in client.get("/api/history").json())


def test_history_lists_recent_checks():
    r = client.post("/api/check", data={"text": "Dear candidate, welcome.", "company": "History Labs"})
    history = client.get("/api/history").json()
    assert history[0]["id"] == r.json()["id"]
    assert history[0]["company"] == "History Labs"


def test_unknown_result_returns_404():
    assert client.get("/api/result/does-not-exist").status_code == 404


# ---------- Community reports ----------

def test_duplicate_report_rejected_even_with_spoofed_user_id():
    body = {"company": "Dup Careers", "domain": "dup-careers.example", "pattern": "Upfront payment demand"}
    assert client.post("/api/report", json={**body, "user_id": "a"}).status_code == 200
    assert client.post("/api/report", json={**body, "user_id": "b"}).status_code == 409


def test_independent_reporters_counted_by_fingerprint():
    body = {"company": "Indie Scam Ltd", "domain": "indie-scam.example", "pattern": "Upfront payment demand"}
    client.post("/api/report", json=body, headers={"user-agent": "browser-one"})
    client.post("/api/report", json=body, headers={"user-agent": "browser-two"})
    res = asyncio.run(find_reports(company="Indie Scam Ltd"))
    assert res["independent_reports"] == 2


# ---------- CORS ----------

def test_cors_blocks_unknown_origin():
    r = client.options(
        "/api/stats",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in r.headers


def test_cors_allows_frontend_origin():
    r = client.get("/api/stats", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


# ---------- Company checks (network mocked) ----------

@pytest.fixture
def offline_network(monkeypatch):
    async def none(*a, **k):
        return None

    async def false(*a, **k):
        return False

    async def healthy(*a, **k):
        return {"live": True, "https": True, "tls_invalid": False}

    monkeypatch.setattr(company_check, "get_domain_age_days", none)
    monkeypatch.setattr(company_check, "check_email_dns", lambda d: {"has_mx": True, "has_spf": True, "tested": True})
    monkeypatch.setattr(company_check, "check_website_health", healthy)
    monkeypatch.setattr(company_check, "check_google_safe_browsing", false)
    monkeypatch.setattr(company_check, "check_virustotal", false)
    return monkeypatch


def _keys(res):
    return {e["key"] for e in res["evidence"]}


def test_new_domain_flagged(offline_network):
    async def ten_days(domain):
        return 10

    offline_network.setattr(company_check, "get_domain_age_days", ten_days)
    res = asyncio.run(company_check.check_company(url="https://fresh-jobs.example/apply"))
    assert "new_domain_critical" in _keys(res)


def test_invalid_tls_flagged(offline_network):
    async def bad_tls(host):
        assert host == "portal.fresh-jobs.example"
        return {"live": True, "https": True, "tls_invalid": True}

    offline_network.setattr(company_check, "check_website_health", bad_tls)
    res = asyncio.run(company_check.check_company(url="https://portal.fresh-jobs.example/login"))
    assert "invalid_tls_certificate" in _keys(res)


def test_missing_mx_flagged(offline_network):
    offline_network.setattr(company_check, "check_email_dns", lambda d: {"has_mx": False, "has_spf": False, "tested": True})
    res = asyncio.run(company_check.check_company(sender="hr@no-mail.example"))
    assert "missing_mx_records" in _keys(res)


def test_clean_corporate_sender_has_no_signals(offline_network):
    res = asyncio.run(company_check.check_company(company="Infosys", sender="recruitment@infosys.com", url="https://careers.infosys.com"))
    assert _keys(res) == set()

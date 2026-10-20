import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from redact import redact
from letter_check import run_regex_rules
from company_check import detect_lookalike, clean_domain
from scoring import build_score

client = TestClient(app)

def test_redaction():
    text = "Call me at +91 9876543210 or send to account 1234567890123. Aadhaar: 1234 5678 9012."
    sanitized = redact(text)
    assert "[PHONE]" in sanitized
    assert "[ACCOUNT]" in sanitized
    assert "[AADHAAR]" in sanitized
    assert "9876543210" not in sanitized

def test_regex_fee_detection():
    sample = "You are selected! Please pay a refundable training fee of Rs 3,500 to confirm."
    result = run_regex_rules(sample)
    assert result["fees_demanded"] is True
    assert any(e["key"] == "upfront_fee" for e in result["evidence"])

def test_lookalike_detection():
    # Test typosquatting
    lookalike = detect_lookalike("micros0ft-careers.com")
    assert lookalike is not None
    assert "Microsoft" in lookalike["matched_brand"]

    # Test legitimate domain
    assert detect_lookalike("microsoft.com") is None
    assert detect_lookalike("google.com") is None

def test_scoring_fee_override():
    letter_res = {"evidence": [{"points": 35, "title": "Upfront fee"}], "fees": True}
    comp_res = {"evidence": []}
    rep_res = {"independent_reports": 0}
    score_out = build_score(letter_res, comp_res, rep_res)
    assert score_out["score"] >= 70
    assert score_out["level"] == "high"

def test_scoring_clean_letter():
    letter_res = {"evidence": [], "fees": False}
    comp_res = {"evidence": []}
    rep_res = {"independent_reports": 0}
    score_out = build_score(letter_res, comp_res, rep_res)
    assert score_out["score"] < 30
    assert score_out["level"] == "low"

def test_api_demo_endpoint():
    response = client.get("/api/demo/deposit")
    assert response.status_code == 200
    data = response.json()
    assert data["score"] >= 70
    assert data["level"] == "high"
    assert len(data["evidence"]) > 0

def test_api_check_endpoint():
    payload = {
        "text": "Congratulations candidate. Direct selection! Pay a registration fee of 1500 immediately.",
        "company": "Fake Corp",
        "sender": "fake@gmail.com",
        "url": "http://192.168.1.1/apply"
    }
    response = client.post("/api/check", data=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] >= 70
    assert "breakdown" in data

def test_api_patterns_endpoint():
    response = client.get("/api/patterns")
    assert response.status_code == 200
    patterns = response.json()
    assert isinstance(patterns, list)
    assert len(patterns) > 0
    assert "Upfront payment demand" in patterns

def test_api_demo_cases_endpoint():
    response = client.get("/api/demo-cases")
    assert response.status_code == 200
    cases = response.json()
    assert isinstance(cases, list)
    assert any(c["key"] == "deposit" for c in cases)

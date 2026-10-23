import re
import os
import json
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ValidationError
from pathlib import Path

logger = logging.getLogger("letter_check")

# Path to centralized config directory
CONFIG_DIR = Path(__file__).resolve().parent / "config"

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def _load_rules():
    """Loads regex fraud detection rules from external JSON configuration as fallback."""
    filepath = CONFIG_DIR / "letter_rules.json"
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            raw_rules = json.load(f)
            return [
                (
                    r["key"],
                    int(r["points"]),
                    r["pattern"],
                    r["title"],
                    r["detail"],
                    r["advice"]
                )
                for r in raw_rules
            ]
    except Exception as e:
        logger.warning(f"Could not load letter_rules.json, using fallback: {e}")
        return [
            (
                "upfront_fee",
                35,
                r"\b(registration fee|processing fee|training fee|security deposit|refundable deposit|pay(?:ment)? of|pay us|deposit of|fee of|laptop deposit|tool cost|onboarding charge)\b",
                "Payment Demand Detected",
                "The offer demands or implies an upfront fee, deposit, or payment. Legitimate employers never charge candidates.",
                "Never send money to an employer or recruiter. Real companies bear all hiring, onboarding, and training expenses."
            ),
            (
                "urgency",
                15,
                r"\b(within \d+ hours?|immediately|urgently|limited slots|act now|today only|last chance|offer expires in|respond before tonight)\b",
                "High Urgency & Pressure Language",
                "The message uses artificial time pressure to prompt quick action before you can verify its legitimacy.",
                "Pause and independently verify the communication through the employer's official website or campus placement cell."
            )
        ]

RULES = _load_rules()

# Rule keys that count as a demand for money (triggers the high-risk override)
FEE_RULE_KEYS = {"upfront_fee", "upi_payment"}
UNAUTHORIZED_RULE_KEYS = {"unauthorized_fake"}

def run_regex_rules(text: str) -> dict:
    """Executes fallback rule-based pattern matching on offer letter text."""
    evidence = []
    fees_demanded = False
    unauthorized = False
    seen = set()

    for key, pts, pattern, title, detail, advice in RULES:
        if key in seen:
            continue
        found = re.finditer(pattern, text, re.I | re.S)
        matches = []
        for m in found:
            phrase = m.group(0).strip()
            if phrase and phrase.lower() not in (p.lower() for p in matches):
                matches.append(phrase)
            if len(matches) >= 5:
                break
        if matches:
            seen.add(key)
            if key in FEE_RULE_KEYS:
                fees_demanded = True
            if key in UNAUTHORIZED_RULE_KEYS:
                unauthorized = True
            evidence.append({
                "source": "Letter Analysis (Rules)",
                "key": key,
                "points": pts,
                "title": title,
                "detail": detail,
                "advice": advice,
                "matches": matches
            })

    return {
        "evidence": evidence,
        "fees_demanded": fees_demanded,
        "unauthorized": unauthorized,
        "total_points": sum(e["points"] for e in evidence)
    }

SYSTEM_PROMPT = (
    "You are an expert cyber fraud analyst specializing in employment & internship scam detection.\n"
    "Evaluate the offer text for zero-shot semantic fraud signals without relying on static keyword datasets:\n"
    "1. Fees/deposits demanded (refundable deposit, training fee, onboarding charge, laptop deposit, courier fee).\n"
    "2. Retention of original academic certificates/marks cards (illegal under labor/education laws).\n"
    "3. Skipping interview rounds or guaranteed placement without technical screening.\n"
    "4. Artificial urgency, pressure tactics, or short deadlines.\n"
    "5. Requests for banking credentials, OTPs, UPI PINs, or netbanking passwords.\n"
    "6. Exclusive recruitment via informal anonymous channels (Telegram, personal WhatsApp).\n"
    "7. Predatory clauses, non-standard penalty bonds, or disproportionate liquidated damages.\n\n"
    "Return ONLY valid JSON matching this schema:\n"
    "{\n"
    '  "fees_demanded": bool,\n'
    '  "fee_details": str,\n'
    '  "original_documents": bool,\n'
    '  "original_doc_details": str,\n'
    '  "no_interview": bool,\n'
    '  "no_interview_details": str,\n'
    '  "urgency": bool,\n'
    '  "urgency_details": str,\n'
    '  "credential_request": bool,\n'
    '  "credential_details": str,\n'
    '  "informal_channel": bool,\n'
    '  "informal_channel_details": str,\n'
    '  "suspicious_clauses": [str],\n'
    '  "fake_looking_details": [str],\n'
    '  "confidence": float,\n'
    '  "summary_reasoning": str\n'
    "}"
)

class LLMFindings(BaseModel):
    """Schema every AI provider's answer is validated against."""
    fees_demanded: bool
    fee_details: str
    original_documents: bool
    original_doc_details: str
    no_interview: bool
    no_interview_details: str
    urgency: bool
    urgency_details: str
    credential_request: bool
    credential_details: str
    informal_channel: bool
    informal_channel_details: str
    suspicious_clauses: List[str]
    fake_looking_details: List[str]
    confidence: float
    summary_reasoning: str


_FINDING_DEFAULTS = {
    name: ([] if field.annotation == List[str] else 0.0 if field.annotation is float else "" if field.annotation is str else False)
    for name, field in LLMFindings.model_fields.items()
}


def _parse_findings(raw: str) -> Optional[dict]:
    """Extracts and validates a JSON object from free-form model text. Returns None if invalid."""
    clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", (raw or "").strip(), flags=re.MULTILINE)
    m = re.search(r"\{.*\}", clean, re.DOTALL)
    if m:
        clean = m.group(0)
    try:
        data = json.loads(clean)
        if not isinstance(data, dict):
            return None
        merged = {**_FINDING_DEFAULTS, **{k: v for k, v in data.items() if v is not None}}
        return LLMFindings.model_validate(merged).model_dump()
    except (ValueError, ValidationError) as e:
        logger.warning(f"AI response failed schema validation: {e}")
        return None


GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"]
CLAUDE_MODEL = "claude-opus-5-5"
OPENROUTER_MODELS = [
    "minimax/minimax-m3.1-flash:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free"
]


async def _gemini_check(text: str, api_key: str) -> Optional[dict]:
    """Runs semantic fraud analysis via Google Gemini API (non-blocking async client)."""
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=LLMFindings,
            temperature=0.1
        )

        for model_name in GEMINI_MODELS:
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=f"Analyze this internship / job offer text:\n\n{text[:10000]}",
                    config=config
                )
                data = _parse_findings(response.text if response else "")
                if data:
                    data["model"] = f"Gemini ({model_name})"
                    return data
            except Exception as e:
                logger.warning(f"Gemini {model_name} attempt failed: {e}")
                continue
    except Exception as e:
        logger.warning(f"Gemini initialization/execution error: {e}")
    return None


async def _claude_check(text: str, api_key: str) -> Optional[dict]:
    """Runs semantic fraud analysis via Anthropic Claude with schema-validated structured output."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)

        response = await client.beta.messages.parse(
            model=CLAUDE_MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Analyze this internship / job offer text:\n\n{text[:10000]}"}],
            output_format=LLMFindings,
        )

        if response.stop_reason == "refusal" or response.parsed_output is None:
            logger.warning(f"Claude returned no structured output (stop_reason={response.stop_reason})")
            return None

        data = response.parsed_output.model_dump()
        data["model"] = f"Claude ({response.model})"
        return data
    except Exception as e:
        logger.warning(f"Claude API check failed: {e}")
    return None


async def _openrouter_check(text: str, api_key: str) -> Optional[dict]:
    """Runs semantic fraud analysis via OpenRouter API."""
    try:
        import httpx
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            for model_name in OPENROUTER_MODELS:
                try:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": f"Analyze this offer:\n\n{text[:10000]}"}
                            ],
                            "temperature": 0.1
                        }
                    )
                    if resp.status_code == 200:
                        data = _parse_findings(resp.json()["choices"][0]["message"]["content"])
                        if data:
                            data["model"] = f"OpenRouter ({model_name.split('/')[0]})"
                            return data
                except Exception as e:
                    logger.warning(f"OpenRouter {model_name} attempt failed: {e}")
                    continue
    except Exception as e:
        logger.warning(f"OpenRouter initialization/execution error: {e}")
    return None


def _provider_for_key(key: str):
    """Picks the provider a key belongs to from its prefix."""
    if key.startswith("sk-or-v1-"):
        return _openrouter_check
    if key.startswith("sk-ant-"):
        return _claude_check
    return _gemini_check


async def llm_check(text: str, api_key: Optional[str] = None) -> dict | None:
    """
    Zero-dataset AI Semantic Analysis: Calls OpenRouter, Gemini, or Claude.
    A per-request `api_key` (supplied by the user) is used for this call only and is
    never written to the process environment, so it cannot leak into other requests.
    """
    if api_key and api_key.strip():
        key = api_key.strip()
        return await _provider_for_key(key)(text, key)

    key = os.getenv("OPENROUTER_API_KEY") or os.getenv("GEMINI_API_KEY")
    if key and key.startswith("sk-or-v1-"):
        res = await _openrouter_check(text, key)
        if res:
            return res

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and not gemini_key.startswith("sk-"):
        res = await _gemini_check(text, gemini_key)
        if res:
            return res

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        res = await _claude_check(text, anthropic_key)
        if res:
            return res

    return None

async def analyze_letter(text: str, api_key: Optional[str] = None) -> dict:
    """Combines zero-dataset LLM semantic validation with fallback rules."""
    rule_results = run_regex_rules(text)
    llm_results = await llm_check(text, api_key=api_key)

    evidence = list(rule_results["evidence"])
    fees_flag = rule_results["fees_demanded"]
    unauthorized_flag = rule_results.get("unauthorized", False)

    if llm_results:
        ai_model_name = llm_results.get("model", "AI Semantic Engine")
        source_label = f"AI Semantic Intelligence ({ai_model_name})"

        # 1. Upfront Fee / Deposit detection
        if llm_results.get("fees_demanded") and not fees_flag:
            fees_flag = True
            evidence.append({
                "source": source_label,
                "key": "ai_fee_demand",
                "points": 35,
                "title": "AI Detected Upfront Fee / Deposit Demand",
                "detail": llm_results.get("fee_details") or "The AI detected language demanding funds, security deposits, or training fees.",
                "advice": "Do not pay any money. Legitimate internships are free to apply and join."
            })

        # 2. Original Document Withholding
        if llm_results.get("original_documents"):
            evidence.append({
                "source": source_label,
                "key": "ai_original_docs",
                "points": 20,
                "title": "Demand for Original Educational Certificates",
                "detail": llm_results.get("original_doc_details") or "The offer demands surrender of original educational certificates or marks cards.",
                "advice": "Never surrender original certificates. Legitimate firms only verify photocopies or digital credentials."
            })

        # 3. Direct Selection / Skipped Interviews
        if llm_results.get("no_interview"):
            evidence.append({
                "source": source_label,
                "key": "ai_no_interview",
                "points": 15,
                "title": "Direct Selection / Skipped Technical Interviews",
                "detail": llm_results.get("no_interview_details") or "Selection made without standard technical interviews or evaluation rounds.",
                "advice": "Verify the role with the official corporate HR department before committing."
            })

        # 4. High Urgency / Pressure
        if llm_results.get("urgency") and not any(e["key"] == "urgency" for e in evidence):
            evidence.append({
                "source": source_label,
                "key": "ai_urgency",
                "points": 15,
                "title": "Artificial Urgency & Coercion Detected",
                "detail": llm_results.get("urgency_details") or "Language creating artificial time pressure to rush candidate decision.",
                "advice": "Pause and independently verify the offer through official channels."
            })

        # 5. Sensitive Credential Harvesting
        if llm_results.get("credential_request") and not any(e["key"] == "credentials" for e in evidence):
            evidence.append({
                "source": source_label,
                "key": "ai_credential_harvesting",
                "points": 20,
                "title": "Sensitive Financial Credential Request",
                "detail": llm_results.get("credential_details") or "Requests OTPs, UPI PINs, netbanking passwords, or CVV codes.",
                "advice": "Never share financial PINs, passwords, or OTPs under any circumstances."
            })

        # 6. Informal Recruitment Channels
        if llm_results.get("informal_channel") and not any(e["key"] == "informal_channel" for e in evidence):
            evidence.append({
                "source": source_label,
                "key": "ai_informal_channel",
                "points": 15,
                "title": "Unconventional Chat Recruitment Channel",
                "detail": llm_results.get("informal_channel_details") or "Insists on interviewing or onboarding exclusively via Telegram or personal WhatsApp.",
                "advice": "Insist on verified corporate communications via official email domains or company portals."
            })

        # 7. Suspicious Clauses
        for clause in llm_results.get("suspicious_clauses", []):
            if clause and len(clause.strip()) > 5:
                evidence.append({
                    "source": source_label,
                    "key": "ai_suspicious_clause",
                    "points": 10,
                    "title": "Unusual Contract Clause Detected",
                    "detail": clause.strip(),
                    "advice": "Review this clause with a mentor or placement cell officer before signing."
                })

        # 8. Fake / Unauthorized Characteristics
        for fake in llm_results.get("fake_looking_details", []):
            if fake and len(fake.strip()) > 5:
                unauthorized_flag = True
                evidence.append({
                    "source": source_label,
                    "key": "ai_unauthorized_fake",
                    "points": 35,
                    "title": "AI Identified Unauthorized / Fake Document Markers",
                    "detail": fake.strip(),
                    "advice": "This document contains characteristics of an unauthorized or simulated offer. Do not trust it."
                })

    return {
        "evidence": evidence,
        "fees": fees_flag,
        "unauthorized": unauthorized_flag,
        "llm_insight": llm_results
    }

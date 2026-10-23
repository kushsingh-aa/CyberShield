from typing import List, Dict, Any

def get_next_steps(level: str, letter: dict, comp: dict) -> List[str]:
    """Generates tailored, actionable safety steps based on detected fraud signals."""
    steps = []

    if level == "high":
        if letter.get("unauthorized"):
            steps.append("DO NOT treat this as a valid employment contract: document detected as unauthorized or simulated.")
        steps.append("DO NOT send any money, registration fees, security deposits, or laptop charges.")
        steps.append("Do not click links to enter banking credentials, OTPs, or UPI passwords.")
        steps.append("Do not surrender original educational certificates or marks cards.")
        steps.append("Verify the HR recruiter's identity by searching the official company LinkedIn or corporate portal.")
        steps.append("Report this sender to your college placement cell and cybercrime authorities (cybercrime.gov.in).")
    elif level == "caution":
        steps.append("Pause before signing or replying: verify the hiring channel through the company's verified website.")
        steps.append("Search the domain in WHOIS/RDAP to ensure it was not created recently.")
        steps.append("Check if the job posting appears on the employer's official Careers page.")
        steps.append("Do not install remote-access software (e.g. AnyDesk, TeamViewer) under the guise of an assessment.")
    else:
        steps.append("While no immediate red flags were detected, always confirm offers via direct company HR channels.")
        steps.append("Never share sensitive personal passwords, UPI PINs, or original certificates.")
        steps.append("Keep a written record of all interview communications and offer paperwork.")

    return steps

def build_score(letter: dict, comp: dict, rep: dict) -> Dict[str, Any]:
    """
    Computes weighted 0-100 fraud risk score combining:
    - Letter Check (45% weight)
    - Company / Domain Check (35% weight)
    - Student Community Reports (20% weight)
    With hard override: Upfront fee demand, unauthorized/fictional document, or 3+ independent reports.
    """
    s_letter = min(100, sum(e["points"] for e in letter.get("evidence", [])))
    s_comp = min(100, sum(e["points"] for e in comp.get("evidence", [])))
    s_rep = min(100, 25 * rep.get("independent_reports", 0))

    final = round(0.45 * s_letter + 0.35 * s_comp + 0.20 * s_rep)

    # Mandatory security override: fee demanded, unauthorized document, or multiple community reports
    fees_demanded = letter.get("fees", False)
    unauthorized = letter.get("unauthorized", False)
    multiple_reports = rep.get("independent_reports", 0) >= 3

    if fees_demanded or multiple_reports:
        final = max(final, 75)
    if unauthorized:
        final = max(final, 85)

    final = max(0, min(100, final))

    if final < 30:
        level = "low"
        badge_label = "Lower Risk"
        badge_color = "emerald"
    elif final < 60:
        level = "caution"
        badge_label = "Caution Required"
        badge_color = "amber"
    else:
        level = "high"
        badge_label = "Unauthorized / High Risk" if unauthorized else "High Scam Risk"
        badge_color = "rose"

    all_evidence = letter.get("evidence", []) + comp.get("evidence", []) + rep.get("evidence", [])

    return {
        "score": final,
        "level": level,
        "badge_label": badge_label,
        "badge_color": badge_color,
        "breakdown": {
            "letter_score": s_letter,
            "company_score": s_comp,
            "reports_score": s_rep,
            "fees_demanded": fees_demanded
        },
        "evidence": all_evidence,
        "evidence_count": len(all_evidence),
        "next_steps": get_next_steps(level, letter, comp)
    }

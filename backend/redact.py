import re

def redact(text: str) -> str:
    """
    Redact Personally Identifiable Information (PII) before sending to LLMs or saving.
    Masks Aadhaar numbers, phone numbers, and bank account numbers while preserving
    company names, domain names, and email domains needed for fraud checks.
    """
    if not text:
        return ""
    
    # Aadhaar number (4 digits, space or hyphen, 4 digits, space or hyphen, 4 digits)
    t = re.sub(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[AADHAAR]", text)
    
    # Indian mobile numbers (+91-9876543210, 9876543210, etc.)
    t = re.sub(r"(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b", "[PHONE]", t)
    
    # Bank account numbers (9 to 18 digits continuous)
    t = re.sub(r"\b\d{9,18}\b", "[ACCOUNT]", t)
    
    # Credit / Debit card numbers (13-16 digits with optional spaces/hyphens)
    t = re.sub(r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "[CARD_NUMBER]", t)
    
    return t

import os
import re
import ssl
import asyncio
import ipaddress
from datetime import datetime, timezone
from urllib.parse import urlparse
import httpx
import tldextract
import dns.resolver
from rapidfuzz import fuzz
from confusable_homoglyphs import confusables

import json
from pathlib import Path

# Path to centralized config directory
CONFIG_DIR = Path(__file__).resolve().parent / "config"

def _load_config(filename: str, fallback):
    filepath = CONFIG_DIR / filename
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback

# Top tech & corporate employers frequently targeted by impersonation scams (loaded from config)
KNOWN_COMPANIES: dict[str, str] = _load_config("known_companies.json", {
    "google.com": "Google",
    "microsoft.com": "Microsoft",
    "amazon.com": "Amazon",
    "apple.com": "Apple",
    "meta.com": "Meta",
    "infosys.com": "Infosys",
    "tcs.com": "Tata Consultancy Services (TCS)",
    "wipro.com": "Wipro",
    "cognizant.com": "Cognizant",
    "accenture.com": "Accenture"
})

FREE_MAIL_PROVIDERS: set[str] = set(_load_config("free_mail_providers.json", [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "proton.me", "protonmail.com", "icloud.com", "zoho.com", "rediffmail.com"
]))

# In-memory RDAP cache to prevent rate-limiting
_RDAP_CACHE: dict[str, int | None] = {}

def clean_domain(raw_input: str) -> str:
    """Extracts the registered domain (e.g. 'infosys-hr.co.in') from emails or URLs."""
    if not raw_input:
        return ""
    val = raw_input.strip()
    if "@" in val and "://" not in val:
        val = val.rsplit("@", 1)[-1]
    elif "://" in val or "/" in val:
        val = urlparse(val if "://" in val else f"http://{val}").hostname or val

    ext = tldextract.extract(val)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}".lower()
    return val.lower().strip(" ./:")

async def get_domain_age_days(domain: str) -> int | None:
    """Queries RDAP to determine how many days ago the domain was registered."""
    if not domain or domain in FREE_MAIL_PROVIDERS:
        return None
    if domain in _RDAP_CACHE:
        return _RDAP_CACHE[domain]

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=6.0) as client:
            resp = await client.get(f"https://rdap.org/domain/{domain}")
            if resp.status_code == 200:
                data = resp.json()
                for event in data.get("events", []):
                    if event.get("eventAction") in ("registration", "created"):
                        date_str = event.get("eventDate", "").replace("Z", "+00:00")
                        reg_date = datetime.fromisoformat(date_str)
                        days = (datetime.now(timezone.utc) - reg_date).days
                        _RDAP_CACHE[domain] = days
                        return days
    except Exception:
        pass

    _RDAP_CACHE[domain] = None
    return None

def check_email_dns(domain: str) -> dict:
    """Verifies whether the domain has valid MX (Mail Exchange) and SPF security records."""
    if not domain or domain in FREE_MAIL_PROVIDERS:
        return {"has_mx": True, "has_spf": True, "tested": False}

    has_mx = False
    has_spf = False

    resolver = dns.resolver.Resolver()
    resolver.lifetime = 3.0
    resolver.timeout = 2.0

    # Test MX
    try:
        mx_answers = resolver.resolve(domain, "MX")
        has_mx = len(mx_answers) > 0
    except Exception:
        has_mx = False

    # Test SPF in TXT
    try:
        txt_answers = resolver.resolve(domain, "TXT")
        for rdata in txt_answers:
            record_str = "".join(str(s) for s in rdata.strings).lower()
            if "v=spf1" in record_str:
                has_spf = True
                break
    except Exception:
        has_spf = False

    return {"has_mx": has_mx, "has_spf": has_spf, "tested": True}

def detect_lookalike(domain: str, claimed_company: str = "") -> dict | None:
    """
    Detects brand spoofing, character confusable homoglyphs,
    and Levenshtein edit distance typosquatting dynamically against any claimed company
    as well as known employers.
    """
    if not domain or domain in FREE_MAIL_PROVIDERS:
        return None

    ext = tldextract.extract(domain)
    clean_name = ext.domain.lower()
    normalized = clean_name.replace("-", "").replace("0", "o").replace("1", "l").replace("vv", "w")

    # 1. Dynamic check against user-supplied or AI-extracted company name
    if claimed_company:
        clean_claimed = re.sub(r"[^a-zA-Z0-9]", "", claimed_company.lower())
        # Remove common corporate suffixes
        clean_claimed = re.sub(r"(pvt|ltd|limited|inc|corp|corporation|technologies|services|llc)$", "", clean_claimed)
        if len(clean_claimed) >= 3 and clean_claimed != clean_name:
            ratio = fuzz.ratio(normalized, clean_claimed)
            partial_ratio = fuzz.partial_ratio(clean_claimed, clean_name)
            has_suspicious_affix = bool(re.search(r"-(careers|jobs|hr|verify|login|recruitment|portal|team)", clean_name))

            if ratio >= 80 or (partial_ratio >= 85 and clean_claimed in normalized) or (clean_claimed in clean_name and has_suspicious_affix):
                return {
                    "type": "typosquatting",
                    "matched_brand": claimed_company,
                    "legitimate_domain": f"{clean_claimed}.com",
                    "reason": f"Domain '{domain}' appears to impersonate '{claimed_company}' using character substitution or deceptive recruitment keywords."
                }

    # 2. Check against known brands fallback
    for known_domain, brand_name in KNOWN_COMPANIES.items():
        known_stem = known_domain.split(".")[0]
        # Ignore exact matches
        if domain == known_domain or domain.endswith(f".{known_domain}"):
            continue
        
        ratio = fuzz.ratio(normalized, known_stem)
        partial_ratio = fuzz.partial_ratio(known_stem, clean_name)
        
        if ratio >= 80 or (partial_ratio >= 85 and known_stem in normalized and domain != known_domain):
            return {
                "type": "typosquatting",
                "matched_brand": brand_name,
                "legitimate_domain": known_domain,
                "reason": f"Domain '{domain}' closely resembles authentic {brand_name} ({known_domain})."
            }

    # 3. Homoglyph check for international/confusable characters
    is_confusable = confusables.is_confusable(domain, preferred_aliases=["latin"])
    if is_confusable:
        return {
            "type": "homoglyph",
            "matched_brand": "Homoglyph / Punycode Lookalike",
            "reason": "The domain name contains confusable or non-standard characters designed to mimic genuine letters."
        }

    return None

def _is_tls_error(exc: BaseException) -> bool:
    """True when a connection failed because the server's TLS certificate could not be verified."""
    while exc is not None:
        if isinstance(exc, ssl.SSLCertVerificationError):
            return True
        if "CERTIFICATE_VERIFY_FAILED" in str(exc):
            return True
        exc = exc.__cause__ or exc.__context__
    return False

async def check_website_health(domain: str) -> dict:
    """Checks if the candidate website responds over HTTPS with a valid (verified) certificate."""
    if not domain or domain in FREE_MAIL_PROVIDERS:
        return {"live": True, "https": True, "tls_invalid": False}

    target_url = f"https://{domain}"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(target_url)
            return {"live": resp.status_code < 500, "https": True, "status": resp.status_code, "tls_invalid": False}
    except Exception as e:
        if _is_tls_error(e):
            return {"live": True, "https": True, "status": None, "tls_invalid": True}
        # Try fallback HTTP
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"http://{domain}")
                return {"live": resp.status_code < 500, "https": False, "status": resp.status_code, "tls_invalid": False}
        except Exception:
            return {"live": False, "https": False, "status": None, "tls_invalid": False}

async def check_google_safe_browsing(url: str) -> bool:
    """Queries Google Safe Browsing API v4 for known malware / phishing links."""
    api_key = os.getenv("SAFE_BROWSING_KEY")
    if not api_key or not url:
        return False

    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
    payload = {
        "client": {"clientId": "cybershield", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(endpoint, json=payload)
            if r.status_code == 200:
                data = r.json()
                return bool(data.get("matches"))
    except Exception:
        pass
    return False

async def check_virustotal(url: str) -> bool:
    """Queries VirusTotal API v3 for URL reputation if VIRUSTOTAL_API_KEY is configured."""
    api_key = os.getenv("VIRUSTOTAL_API_KEY")
    if not api_key or not url:
        return False
    try:
        import base64
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        headers = {"x-apikey": api_key, "accept": "application/json"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=headers)
            if r.status_code == 200:
                stats = r.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                if stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 1:
                    return True
    except Exception:
        pass
    return False

async def check_company(company: str = "", sender: str = "", url: str = "") -> dict:
    """
    Runs multi-layer technical intelligence on sender email, company name, and link URL:
    - Domain extraction & comparison
    - RDAP domain age calculation
    - DNS MX/SPF verification
    - Brand lookalike / homoglyph detection
    - Website connectivity & Google Safe Browsing
    """
    evidence = []
    sender_domain = clean_domain(sender)
    url_domain = clean_domain(url)
    primary_domain = url_domain or sender_domain

    target_for_age = url_domain or (sender_domain if sender_domain not in FREE_MAIL_PROVIDERS else "")
    check_dns = bool(sender_domain and sender_domain not in FREE_MAIL_PROVIDERS)
    # The TLS check must hit the exact host in the link (e.g. portal.example.com), not just the registered domain
    url_host = (urlparse(url if "://" in url else f"https://{url}").hostname or "").lower() if url else ""

    async def _none():
        return None

    # Network lookups run concurrently; DNS uses a blocking resolver so it runs in a worker thread
    age_days, dns_status, health, is_malicious, is_vt_flagged = await asyncio.gather(
        get_domain_age_days(target_for_age) if target_for_age else _none(),
        asyncio.to_thread(check_email_dns, sender_domain) if check_dns else _none(),
        check_website_health(url_host) if url_host else _none(),
        check_google_safe_browsing(url) if url else _none(),
        check_virustotal(url) if url else _none(),
    )

    # 1. Sender domain checks
    if sender_domain in FREE_MAIL_PROVIDERS:
        evidence.append({
            "source": "Company & Domain Intelligence",
            "key": "free_mail_sender",
            "points": 18,
            "title": "Recruiter Using Public Email Service",
            "detail": f"Sender '{sender}' uses a free public email provider ({sender_domain}) rather than an authorized company domain.",
            "advice": "Genuine talent acquisition teams rarely recruit from free Gmail or Yahoo accounts."
        })

    # 2. Domain Mismatch
    if sender_domain and url_domain and sender_domain != url_domain:
        if sender_domain not in FREE_MAIL_PROVIDERS:
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "domain_mismatch",
                "points": 12,
                "title": "Sender and Portal Domains Differ",
                "detail": f"Sender domain '{sender_domain}' differs from link domain '{url_domain}'.",
                "advice": "Verify whether the portal belongs to an authorized third-party ATS (like Greenhouse or Lever) or an unauthorized site."
            })

    # 3. Lookalike Detection
    for dom in filter(None, [url_domain, sender_domain]):
        lookalike = detect_lookalike(dom, claimed_company=company)
        if lookalike:
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "brand_lookalike",
                "points": 30,
                "title": "Possible Brand Typosquatting / Impersonation",
                "detail": lookalike["reason"],
                "advice": "Check the exact spelling in the address bar. Scammers often register lookalike domains with extra dashes or digit replacements."
            })
            break

    # 4. Domain Age (RDAP)
    if target_for_age:
        if age_days is not None:
            if age_days < 60:
                evidence.append({
                    "source": "Company & Domain Intelligence",
                    "key": "new_domain_critical",
                    "points": 30,
                    "title": f"Newly Created Domain ({age_days} days old)",
                    "detail": f"Domain '{target_for_age}' was registered only {age_days} days ago. Fraudulent job portals are frequently disposable and recently created.",
                    "advice": "Exercise extreme caution with newly registered websites claiming to represent established firms."
                })
            elif age_days < 180:
                evidence.append({
                    "source": "Company & Domain Intelligence",
                    "key": "new_domain_caution",
                    "points": 15,
                    "title": f"Relatively Young Domain ({age_days} days old)",
                    "detail": f"Domain '{target_for_age}' was registered {age_days} days ago.",
                    "advice": "Cross-check this domain against the company's established social presence and news releases."
                })

    # 5. Email DNS (MX & SPF)
    if dns_status:
        if dns_status["tested"]:
            if not dns_status["has_mx"]:
                evidence.append({
                    "source": "Company & Domain Intelligence",
                    "key": "missing_mx_records",
                    "points": 15,
                    "title": "Sender Domain Lacks MX Records",
                    "detail": f"The domain '{sender_domain}' has no valid mail exchanger (MX) DNS configuration, suggesting forged sender headers.",
                    "advice": "Inspect full email headers to check sender SPF/DKIM verification."
                })
            elif not dns_status["has_spf"]:
                evidence.append({
                    "source": "Company & Domain Intelligence",
                    "key": "missing_spf_records",
                    "points": 8,
                    "title": "Missing Email Security Records (SPF)",
                    "detail": f"Domain '{sender_domain}' lacks an SPF record to guard against domain spoofing.",
                    "advice": "Be aware that unauthenticated emails can be easily faked by external senders."
                })

    # 6. Raw IP or Insecure HTTP in URL
    if url:
        parsed_url = urlparse(url if "://" in url else f"http://{url}")
        host = (parsed_url.hostname or "").lower()
        if parsed_url.scheme != "https":
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "insecure_http",
                "points": 8,
                "title": "Insecure Connection (HTTP without TLS)",
                "detail": f"The link '{url}' does not use encrypted HTTPS.",
                "advice": "Do not enter login credentials or personal information on non-HTTPS portals."
            })
        try:
            ipaddress.ip_address(host)
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "raw_ip_address",
                "points": 20,
                "title": "Link Points to Raw IP Address",
                "detail": f"The URL uses a raw IP address ({host}) rather than a registered organizational hostname.",
                "advice": "Legitimate enterprise portals use branded domain names, never direct IP addresses."
            })
        except ValueError:
            pass

        # 7. Invalid TLS certificate
        if health and health.get("tls_invalid"):
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "invalid_tls_certificate",
                "points": 15,
                "title": "Invalid HTTPS Certificate",
                "detail": f"The site '{url_host}' presents a TLS certificate that could not be verified (expired, self-signed, or issued for another domain).",
                "advice": "Do not enter credentials or documents on a site with a certificate warning. Genuine company portals have valid certificates."
            })

        # 8. Google Safe Browsing
        if is_malicious:
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "google_safe_browsing_match",
                "points": 45,
                "title": "Confirmed Malicious Portal in Threat Feed",
                "detail": "This URL has been flagged in active threat intelligence feeds as a phishing or malware distribution vector.",
                "advice": "Do not click or interact with this link. Block the sender immediately."
            })

        # 9. VirusTotal URL Reputation Check
        if is_vt_flagged:
            evidence.append({
                "source": "Company & Domain Intelligence",
                "key": "virustotal_threat_match",
                "points": 40,
                "title": "VirusTotal Malicious / Phishing Detection",
                "detail": "This portal URL has been flagged as malicious or suspicious by multiple antivirus and security engines on VirusTotal.",
                "advice": "Do not submit any personal credentials, resumes, or banking details to this website."
            })

    return {
        "domain": primary_domain,
        "sender_domain": sender_domain,
        "url_domain": url_domain,
        "evidence": evidence
    }

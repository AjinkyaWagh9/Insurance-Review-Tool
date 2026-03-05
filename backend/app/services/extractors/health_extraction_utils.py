"""
Health Policy Extraction Utilities — RULEBOOK Implementation
Covers: ManipalCigna · ICICI Lombard · Aditya Birla
"""

import re

# ---------------------------------------------------------------------------
# RULE 10: Insurer Detection
# ---------------------------------------------------------------------------

INSURER_SIGNATURES = {
    "manipalcigna": [r'ManipalCigna', r'Cigna', r'LIFETM\d+'],
    "icici_lombard": [r'ICICI\s+Lombard', r'4225i/', r'ELVT/'],
    "aditya_birla":  [r'Aditya\s+Birla', r'ABHICL', r'Activ\s+One', r'ADIHLIP'],
}


def detect_insurer(text: str) -> str:
    for insurer, patterns in INSURER_SIGNATURES.items():
        for p in patterns:
            if re.search(p, text, re.IGNORECASE):
                return insurer
    return "unknown"


# ---------------------------------------------------------------------------
# RULE 2: Section Anchor Windows
# ---------------------------------------------------------------------------

SECTION_ANCHORS = {
    "premium": [
        r"IV\.\s+Premium\s+Details",            # Aditya Birla
        r"YOUR\s+PREMIUM\s+DETAILS",             # ManipalCigna
        r"PREMIUM\s+CERTIFICATE",                # ManipalCigna certificate
        r"Premium\s+Details",                    # generic
        r"Total\s+Premium\s+paid",
        r"Premium\s+paid\s+\(inclusive",
    ],
    "policy_info": [
        r"II\.\s+Policy\s+Details",              # Aditya Birla
        r"POLICY\s+SCHEDULE",                    # ManipalCigna
        r"Policy\s+Certificate",
        r"KNOW\s+YOUR\s+POLICY",
        r"POLICY\s+DETAILS",
        r"CUSTOMER\s+INFORMATION\s+SHEET",       # RULE 2.1: CIS backup anchor (clean tabular data)
    ],
    "insured": [
        r"III\.\s+Insured\s+Person['\u2019s]*\s+Details",    # Aditya Birla
        r"INSURED\s+PERSON['\u2019S]*S?\s+DETAILS",          # ManipalCigna
        r"Insured\s+Details",
        r"No\s+of\s+Insured",
    ],
    "waiting": [
        r"WAITING\s+PERIOD\s+IN\s+YOUR\s+POLICY",  # ManipalCigna
        r"Standard\s+Waiting\s+Period",
        r"Waiting\s+Period",
    ],
    "benefits": [
        r"BENEFITS\s+UNDER\s+THE\s+POLICY",
        r"Table\s+of\s+Benefits",
        r"Key\s+(?:Basic\s+)?Covers",
        # NEW ANCHORS TO CATCH MISSING FEATURES
        r"ADDITIONAL\s+COVERS",                 # Catches Worldwide Emergency table
        r"Restoration\s+of\s+Sum\s+Insured",    # Forces a window right on Restoration
        r"Worldwide\s+Medical\s+Emergency",     # Forces a window right on Global Cover
        # NEW ANCHORS FOR NCB:
        r"Value\s+Added\s+Covers",
        r"Cumulative\s+Bonus",
    ],
    "financial_limits": [
        r"Financial\s+limits\s+of\s+coverage",
        r"Sub-?limit",
        r"Co-[Pp]ayment",
    ],
}

WINDOW_SIZE = 4000  # chars after anchor


def extract_section_window(text: str, section_key: str) -> str:
    for pattern in SECTION_ANCHORS.get(section_key, []):
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start = max(0, match.start() - 200)
            end = min(len(text), match.end() + WINDOW_SIZE)
            return text[start:end]
    return ""


def build_smart_context(text: str) -> str:
    """Build labeled section windows for LLM. Hard cap ~25000 chars."""
    sections = ["policy_info", "premium", "insured", "waiting", "financial_limits", "benefits"]
    parts = []
    seen_offsets: set[int] = set()
    for section in sections:
        for pattern in SECTION_ANCHORS.get(section, []):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                bucket = match.start() // 500
                if bucket not in seen_offsets:
                    seen_offsets.add(bucket)
                    start = max(0, match.start() - 200)
                    end = min(len(text), match.end() + WINDOW_SIZE)
                    
                    found_text = match.group(0).strip()[:50]
                    print(f"[DEBUG][smart_context] Found anchor for '{section}': \"{found_text}\"")
                    
                    parts.append(f"\n\n--- SECTION: {section.upper()} (Anchor: \"{found_text}\") ---\n")
                    parts.append(text[start:end])
                # We do NOT 'break' here anymore. 
                # This allows multiple anchors within the same section 
                # (like "BENEFITS" and "Restoration") to trigger their own windows.
    result = "".join(parts)
    # If no anchors found at all, fall back to head+tail smart truncation
    if not result.strip():
        MAX_CHARS = 12000
        if len(text) <= MAX_CHARS:
            return text
        return (
            text[:8000]
            + "\n\n[... middle section truncated for length ...]\n\n"
            + text[-4000:]
        )
    return result[:25000]


# ---------------------------------------------------------------------------
# RULE 3: Premium Extraction
# ---------------------------------------------------------------------------

PREMIUM_PATTERNS = [
    # Aditya Birla / generic: "Total Premium (₹) \n 33,936.00"  (works on raw multiline)
    (r'Total\s+Premium\s*\(?[₹Rs\.INR]*\)?\s*[\n\r]+\s*([1-9][\d,]+(?:\.\d{1,2})?)', 'total_newline'),

    # ICICI Lombard 3-column: "Total Premium (₹)\n100,571.21\t18,102.82\t118,674.00"
    # Last number on the next line after "Total Premium" header
    (r'Total\s+Premium\s*\(?[₹Rs\.INR]*\)?\s*\n(?:[^\n]*?[\t ]+)?([1-9][\d,]+(?:\.\d{1,2})?)[\r\n]', 'icici_3col'),

    # ManipalCigna certificate: "paid the premium of Rs.1,79,042.59"
    (r'paid\s+the\s+premium\s+of\s+Rs\.?\s*([1-9][\d,]+(?:\.\d{1,2})?)', 'certificate'),

    # ManipalCigna table: value after GST Cess column
    (r'GST\s+Cess\s*\(?Rs\.?\)?\s+([\d.]+)\s+([1-9][\d,]+(?:\.\d{1,2})?)', 'after_gst_cess'),

    # Direct label: "Total Premium paid (₹) 118674"
    (r'Total\s+Premium\s+paid\s*\(?[₹Rs\.INR]*\)?\s+([1-9][\d,]+(?:\.\d{1,2})?)', 'paid_label'),

    # Total Premium Payable (inline, handles Rs. prefix on same line)
    (r'Total\s+Premium\s+Payable[^:\n]{0,30}[:\s][₹Rs\.INR\s]*([1-9][\d,]+(?:\.\d{1,2})?)', 'total_payable_inline'),

    # Total Amount Payable
    (r'Total\s+Amount\s+Payable\s*[:\|]?\s*[₹Rs\.INR\s]*([1-9][\d,]+(?:\.\d{1,2})?)', 'total_amount_payable'),

    # Premium Amount label
    (r'Premium\s+Amount\s*[:\|]?\s*[₹Rs\.INR\s]*([1-9][\d,]+(?:\.\d{1,2})?)', 'premium_amount_label'),

    # Generic "Total Premium" inline
    (r'Total\s+Premium\b[^₹\d\n]{0,20}[₹Rs\.INR\s]*([1-9][\d,]+(?:\.\d{1,2})?)', 'generic'),
]


def extract_premium(text: str) -> float | None:
    """
    Run ordered regex patterns on text (should be the premium section window).
    Searches both the raw text (preserving newlines for multiline patterns) and a
    space-normalised copy (for single-line inline patterns).
    Returns the float premium value or None.
    """
    cleaned = re.sub(r'\s+', ' ', text)

    for pattern, label in PREMIUM_PATTERNS:
        # Try raw text first (catches multiline patterns)
        for search_text in (text, cleaned):
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                raw = match.group(2) if label == 'after_gst_cess' else match.group(1)
                try:
                    val = float(raw.replace(",", ""))
                    # Sanity check: health insurance premiums typically ₹3K–₹5L annualized
                    if val >= 1000:
                        print(f"[DEBUG][premium] pattern='{label}' matched → {val}")
                        return val
                except (ValueError, TypeError):
                    pass
                break  # matched but value invalid — try next pattern

    print("[DEBUG][premium] no regex match — falling through to LLM")
    return None


# ---------------------------------------------------------------------------
# RULE 4: Premium Sanity + Annualization
# ---------------------------------------------------------------------------

def validate_and_annualize_premium(raw_amount: float, tenure_years: int, payment_mode: str) -> dict:
    annualized = raw_amount / tenure_years if tenure_years and tenure_years > 0 else raw_amount
    return {
        "total_premium_paid": int(raw_amount),
        "annualized_premium": int(annualized),
        "tenure_years": tenure_years,
        "payment_mode": payment_mode,
        "is_single_payment": payment_mode.lower() == "single",
        "sanity_ok": 3000 <= annualized <= 500000,
    }


# ---------------------------------------------------------------------------
# RULE 6: Waiting Periods
# ---------------------------------------------------------------------------

WAITING_PERIOD_PATTERNS = {
    "initial_days": [
        r'[Ii]nitial\s+[Ww]aiting\s+[Pp]eriod[^\n]*?(\d+)\s*[Dd]ays',
    ],
    "ped_months": [
        r'[Pp]re[\s\-][Ee]xisting\s+[Dd]isease[^\n]*?(\d+)\s*[Mm]onths',
        r'[Pp]re[\s\-][Ee]xisting\s+[Dd]isease[^\n]*?(\d+)\s*[Yy]ears',
        r'PED[^\n]*?(\d+)\s*[Yy]ears',
        r'PED[^\n]*?(\d+)\s*[Mm]onths',
        r'Pre-Existing\s+Disease\s+Waiting\s+Period[^\n]*?\n[^\n]*?(\d+)\s*(Years|Months)',
    ],
    "specific_months": [
        r'[Ss]pecific\s+(?:disease\s+)?[Ww]aiting\s+[Pp]eriod[^\n]*?(\d+)\s*[Mm]onths',
        r'[Ss]pecific\s+(?:[Ii]llness|[Dd]isease)[^\n]*?(\d+)\s*[Yy]ears',
        r'[Ss]pecific\s+disease\s+[Ww]aiting\s+period[^\n]*?\n[^\n]*?(\d+)\s*(Years|Months)',
    ],
}


def extract_waiting_periods(text: str) -> dict:
    """Extract waiting periods from a section window. Returns partial dict; missing = None."""
    result: dict = {}

    # initial_days
    for p in WAITING_PERIOD_PATTERNS["initial_days"]:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            result["initial_days"] = int(m.group(1))
            break

    # ped_months — handle years vs months
    for p in WAITING_PERIOD_PATTERNS["ped_months"]:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            unit = m.group(2).lower() if len(m.groups()) > 1 else ""
            result["ped_months"] = val * 12 if "year" in unit else val
            break

    # specific_months — handle years vs months
    for p in WAITING_PERIOD_PATTERNS["specific_months"]:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            unit = m.group(2).lower() if len(m.groups()) > 1 else ""
            result["specific_months"] = val * 12 if "year" in unit else val
            break

    return result


# ---------------------------------------------------------------------------
# RULE 6: Aditya Birla Insured Continuation Table
# ---------------------------------------------------------------------------

def extract_aditya_birla_insured_continuation(insured_window: str) -> dict:
    result: dict = {}

    si = re.search(r'Base\s+Sum\s+Insured[^\n]*\n[^\n]*?([1-9][\d,]+)', insured_window)
    if si:
        result["sum_insured"] = int(si.group(1).replace(",", ""))

    init = re.search(r'Initial\s+Waiting\s+Period[^\n]*\n[^\n]*?(\d+)\s*(Days|days)', insured_window)
    if init:
        result["initial_waiting_days"] = int(init.group(1))

    spec = re.search(r'Specific\s+disease\s+Waiting\s+period[^\n]*\n[^\n]*?(\d+)\s*(Years|Months)', insured_window, re.IGNORECASE)
    if spec:
        val, unit = int(spec.group(1)), spec.group(2).lower()
        result["specific_waiting_months"] = val * 12 if "year" in unit else val

    ped = re.search(r'Pre-Existing\s+Disease\s+Waiting\s+Period[^\n]*\n[^\n]*?(\d+)\s*(Years|Months)', insured_window, re.IGNORECASE)
    if ped:
        val, unit = int(ped.group(1)), ped.group(2).lower()
        result["ped_waiting_months"] = val * 12 if "year" in unit else val

    sc = re.search(r'Super\s+Credit\s+Amount[^\n]*\n[^\n]*?([1-9][\d,]+)', insured_window)
    if sc:
        result["super_credit_amount"] = int(sc.group(1).replace(",", ""))

    return result


# ---------------------------------------------------------------------------
# RULE 7: Insured Member Count
# ---------------------------------------------------------------------------

def count_insured_members(insured_window: str) -> int | None:
    # ManipalCigna / ICICI: numbered rows "1 Name" or "1. Name"
    matches = re.findall(r'^\s*(\d+)[\.\s]+[A-Z][a-z]', insured_window, re.MULTILINE)
    if matches:
        return max(int(m) for m in matches)

    # Aditya Birla: relationship keywords
    rel_matches = re.findall(
        r'\b(Self|Spouse|Son|Daughter|Father|Mother|Father-in-Law|Mother-in-Law)\b',
        insured_window, re.IGNORECASE
    )
    if rel_matches:
        return len(rel_matches)

    # Fallback: count DOB occurrences
    dob_count = len(re.findall(r'\d{2}[/-]\d{2}[/-]\d{4}', insured_window))
    return dob_count if dob_count > 0 else None


# ---------------------------------------------------------------------------
# RULE 8: Room Rent
# ---------------------------------------------------------------------------

ROOM_RENT_PATTERNS = [
    (r'[Ss]ingle\s+[Pp]rivate\s+(?:AC\s+)?[Rr]oom',      "Single Private Room"),
    (r'[Aa]ny\s+[Rr]oom\s+of\s+your\s+[Cc]hoice',         "Any Room - No Restriction"),
    (r'any\s+room\s+including\s+suite',                     "Any Room Including Suite"),
    (r'any\s+room\s+except\s+suite',                        "Any Room Except Suite"),
    (r'[Nn]o\s+(?:room\s+)?(?:rent\s+)?(?:limit|cap)',     "No Room Rent Limit"),
    (r'[Aa]ny\s+[Rr]oom',                                  "Any Room - No Restriction"),
]

ROOM_RENT_DYNAMIC = [
    (r'(\d+)%\s+of\s+[Ss]um\s+[Ii]nsured\s+per\s+day',    lambda m: f"{m.group(1)}% of Sum Insured/day"),
    (r'[₹Rs\.]+\s*([1-9][\d,]+)\s*(?:per|/)\s*day',        lambda m: f"₹{m.group(1)}/day"),
]


def extract_room_rent(benefits_window: str, financial_window: str) -> str | None:
    combined = benefits_window + "\n" + financial_window
    for pattern, label in ROOM_RENT_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return label
    for pattern, formatter in ROOM_RENT_DYNAMIC:
        m = re.search(pattern, combined, re.IGNORECASE)
        if m:
            return formatter(m)
    return None


# ---------------------------------------------------------------------------
# RULE 9: Policy Details Fields
# ---------------------------------------------------------------------------

POLICY_DETAILS_PATTERNS = {
    "policy_number":      r'Policy\s+(?:No\.?|Number)\s*[\|:\t ]+\s*([\w\-/]+)',
    "product_name":       r'(?:Product\s+Name|Plan\s+Name|Name\s+of\s+Insurance\s+Product)\s*[\|:\t ]+\s*([^\n]+)',
    "plan_variant":       r'\bPlan\s*[\|:\t ]+\s*(MAX|PLUS|PRIME|ELEVATE|[A-Z]+)',
    "start_date":         r'(?:Start\s+Date(?:\s+of\s+Policy)?|Policy\s+Start\s+Date)\s*[\|:\t ]+\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
    "expiry_date":        r'(?:Expiry\s+Date|Policy\s+End\s+Date)\s*[\|:\t ]+\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
    "policy_tenure":      r'Policy\s+Tenure\s*[\|:\t ]+\s*(\d+)\s*[Yy]ear',
    "policy_type":        r'Policy\s+Type\s*[\|:\t ]+\s*(Family\s+Floater|Individual|Floater)',
    "policy_category":    r'Policy\s+Category\s*[\|:\t ]+\s*(Renewal|New|Fresh)',
    "mode_of_payment":    r'Mode\s+of\s+(?:Premium\s+)?[Pp]ayment\s*[\|:\t ]+\s*(Single|Annual|Monthly|Quarterly)',
    "first_policy_start": r'First\s+Policy\s+Start\s+[Dd]ate\s*[\|:\t ]+\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
    "previous_policy_no": r'Previous\s+Policy\s+(?:No\.?|Number)\s*[\|:\t ]+\s*([\w\-/]+)',
}


def extract_policy_details(policy_info_window: str) -> dict:
    result: dict = {}
    for field, pattern in POLICY_DETAILS_PATTERNS.items():
        m = re.search(pattern, policy_info_window, re.IGNORECASE)
        if m:
            result[field] = m.group(1).strip()
    return result


# ---------------------------------------------------------------------------
# RULE 5 + 5.1 + 5.2: Sum Insured (with context-aware exclusion + fragmented number cleanup)
# ---------------------------------------------------------------------------

# Sections whose nearby headline indicates we should SKIP a sum insured match
# (RULE 5.1: avoid Previous Insurance table and Additional Covers section)
_SUM_INSURED_EXCLUSION_PATTERNS = [
    r'Previous\s+Insurance',
    r'Previous\s+Insurer',
    r'Additional\s+Cover',
    r'Super\s+Credit',
]

SUM_INSURED_PATTERNS = [
    # 1. ManipalCigna: "#Sum Insured^1" or "#Sum Insured A1" (OCR typo) followed by value on next line
    #    Allows spaces/newlines inside captured number to handle PDF fragmentation
    r'^#?Sum\s+Insured[\^A1\s]*\n[^\n]*?([1-9][\d,\s]{5,})',

    # 2. ManipalCigna same-line (e.g. "Sum Insured : 10000000")
    r'^#?Sum\s+Insured[\^A1\s]*(?:[:\-]\s*)?(?:[₹Rs\.INR\s]*)\s*([1-9][\d,\s]{5,})',

    # 3. ICICI floater: "Sum Insured (₹)** 1,000,000.00"
    r'Sum\s+Insured\s*\(?[₹Rs\.INR]*\)?\*{0,2}\s+([1-9][\d,]+(?:\.\d{1,2})?)',

    # 4. Aditya Birla continuation table: "Base Sum Insured ... 2500000"
    r'Base\s+Sum\s+Insured[^\n]*\n[^\n]*?([1-9][\d,]+)',

    # 5. Generic "Sum Insured (in Rs)"
    r'Sum\s+Insured\s+\(in\s+Rs\)\s+([1-9][\d,]+)',

    # 6. Colon-separator fallback
    r'Sum\s+Insured[^\n:]{0,30}:\s*([1-9][\d,]+)',
]


def _context_is_excluded(text: str, match_start: int, context_chars: int = 400) -> bool:
    """
    RULE 5.1: Skip sum insured matches that appear directly after an excluded section header.
    We look back up to context_chars chars. If an exclusion header is found AND there is no
    policy section separator (POLICY SCHEDULE, CIS, etc.) between that header and our match,
    then the match is excluded.
    """
    context_before = text[max(0, match_start - context_chars):match_start]
    for excl_pattern in _SUM_INSURED_EXCLUSION_PATTERNS:
        excl_match = re.search(excl_pattern, context_before, re.IGNORECASE)
        if excl_match:
            # Check if a new section starts AFTER the exclusion header in this context window
            # i.e., was there a policy schedule / CIS header that resets the section?
            tail = context_before[excl_match.end():]
            section_reset = re.search(
                r'(POLICY\s+SCHEDULE|CUSTOMER\s+INFORMATION\s+SHEET|KNOW\s+YOUR\s+POLICY'
                r'|II\.\s+Policy|POLICY\s+DETAILS|Policy\s+Schedule)',
                tail, re.IGNORECASE
            )
            if not section_reset:
                return True
    return False


def extract_sum_insured(text: str) -> int | None:
    """
    RULE 5.1 + 5.2: Extract base sum insured with:
    - Context-aware exclusion of Previous Insurance / Additional Covers sections
    - Fragmented number cleanup (strips spaces/newlines from captured group)
    - Minimum sanity check (>= ₹1 lakh)
    """
    for pattern in SUM_INSURED_PATTERNS:
        flags = re.IGNORECASE | re.MULTILINE
        for m in re.finditer(pattern, text, flags):
            # RULE 5.1: skip matches inside excluded sections
            excluded = _context_is_excluded(text, m.start())
            raw_value = m.group(1)
            clean_value = re.sub(r'[\s\n,]', '', raw_value)
            clean_value = clean_value.split('.')[0]
            if excluded:
                print(f"[DEBUG][sum_insured] SKIPPED (excluded context) — pattern='{pattern[:40]}' raw='{raw_value[:30]}'")
                continue
            try:
                val = int(clean_value)
                if val >= 100000:
                    print(f"[DEBUG][sum_insured] MATCHED — pattern='{pattern[:40]}' raw='{raw_value[:30]}' → {val}")
                    return val
                else:
                    print(f"[DEBUG][sum_insured] below sanity threshold — val={val}")
            except (ValueError, TypeError):
                print(f"[DEBUG][sum_insured] parse error on '{clean_value}'")
                continue
    print("[DEBUG][sum_insured] no regex match — falling through to LLM")
    return None


# ---------------------------------------------------------------------------
# RULE 15: Global Coverage Detection
# ---------------------------------------------------------------------------
def extract_global_coverage(text: str) -> bool:
    """
    Scans the entire policy text for indicators of international or worldwide coverage.
    """
    patterns = [
        r'Worldwide\s+(?:Medical|Emergency|Cover|Hospitalization|Coverage)',
        r'Global\s+(?:Health|Cover|Hospitalization|Coverage)',
        r'Coverage\s+outside\s+India',
    ]
    
    # FIX: Search the entire text instead of cutting off at 15,000 chars
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            print(f"[DEBUG][global_cover] MATCHED pattern: {p}")
            return True
            
    return False


"""
Prompts for Term Insurance policy extraction.
Used by term_extractor.py with GPT-4o.
Modeled on the health insurance HEALTH_EXTRACTION_PROMPT pattern.
"""

TERM_EXTRACTION_PROMPT = '''
You are an expert Indian term life insurance analyst. Extract structured data from this policy document.
Return ONLY a valid JSON object. No explanation. No markdown. No code blocks.
Use null for fields that cannot be found. Never return 0 for age fields — use null if not found.

Extract EXACTLY these fields:

{{
  "insurer_name": "string — full insurer name e.g. 'HDFC Life', 'LIC', 'Max Life'. Never return 'Unknown'.",
  "plan_name": "string | null — name of the term plan e.g. 'Click 2 Protect Super', 'Tech Term'",
  "policy_number": "string | null",
  "extracted_sum_assured": "number — integer in rupees. e.g. 20000000 for ₹2 Crore. REQUIRED.",
  "premium_amount": "number | null — annual premium in rupees",
  "premium_payment_term": "number | null — number of years premium is paid",
  "policy_term": "number | null — total duration of the policy in years",
  "policy_start_age": "number | null — age of policyholder when policy started",
  "policy_term_end_age": "number | null — age at which coverage ends. Calculate as: policy_start_age + policy_term if not explicitly stated. NEVER return 0.",
  "maturity_date": "string | null — date when policy expires, if mentioned",
  "riders_present": [
    "array of strings — list every rider found in the document",
    "Common riders to look for: Waiver of Premium, Accidental Death Benefit, Critical Illness Rider, Income Benefit Rider, Child Support Benefit",
    "Use the exact name as it appears in the document",
    "Return [] if no riders found — do NOT return null"
  ],
  "exclusions_summary": [
    "array of strings — key exclusions mentioned e.g. 'Suicide within 1 year', 'Death due to war'",
    "Return [] if none found"
  ],
  "death_benefit_type": "string | null — e.g. 'Lump Sum', 'Monthly Income', 'Lump Sum + Monthly Income'",
  "is_smoker_policy": "boolean | null — true if policy was issued for a smoker",
  "nominee_name": "string | null"
}}

IMPORTANT RULES:
1. extracted_sum_assured is the single most important field. Search for terms like "Sum Assured", "Life Cover", "Death Benefit Amount", "Coverage Amount". It will be a large number (typically 50 Lakhs to 10 Crore).
2. For policy_term_end_age: if the document says "Policy Term: 30 years" and the policyholder age is 35, return 65. Search for "Maturity Age", "Cover Upto Age", "Policy End Age".
3. For insurer_name: look at the letterhead, header, footer, or "Insurer" / "Insurance Company" field. Never return "Unknown" or null — make your best inference from document branding.
4. For riders_present: search EVERY section of the document — including "Riders", "Add-on Benefits", "Optional Benefits", 
   "Supplementary Benefits", "Schedule of Benefits", "Policy Schedule", and the fine print. 
   Look for any line that contains the word "Rider" or "Benefit" attached to a named coverage. 
   Extract the EXACT name as it appears. Common examples for Indian term policies:
   "Waiver of Premium Plus Rider", "Critical Illness and Disability Rider", 
   "Accidental Death and Dismemberment Rider", "Income Benefit Rider".
   Return the rider name exactly as found in the document. Never return an empty array if rider names appear anywhere in the text.
5. If a field truly cannot be found after thorough search, return null — not 0, not "", not "N/A".

Policy document text:
{policy_text}
'''

TERM_RECOMMENDATION_PROMPT = '''
You are an expert Indian term life insurance advisor. Generate a concise policy audit narrative.

You will receive:
1. Extracted policy data (from PDF)
2. User profile (from wizard steps)
3. Scoring result (calculated by engine)

Generate:
A) gap_explanation — 2-3 sentences explaining WHY the gap exists based on their specific numbers
B) pros — list of policy strengths (max 4)
C) cons — list of policy weaknesses (max 4)
D) payout_strategy — 1-2 sentences on lump sum vs income payout based on spouse_working
E) recommendations — 2-4 prioritized action items

RULES:
- Use actual numbers from the data (e.g. ₹4.6 Cr shortfall, not "significant gap")
- If loans > 20 Lakhs, suggest MWP Act endorsement
- If family_secure_years < 2, flag as critical urgency
- If retirement_age > 65, flag extended exposure window
- If Waiver of Premium rider is missing, make it recommendation #1
- payout_strategy: if spouse_working is true → Lump Sum is safe. If false → suggest Income + Lump Sum combo.
- Be specific. Do not use generic insurance marketing language.

Return ONLY valid JSON. No explanation. No markdown.

{
  "gap_explanation": "string",
  "pros": ["string"],
  "cons": ["string"],
  "payout_strategy": "string",
  "recommendations": [
    {
      "priority": "primary | secondary | tertiary",
      "title": "string",
      "description": "string"
    }
  ]
}

Policy Data: {extracted_json}
User Profile: {user_context_json}
Score Result: {score_result_json}
'''

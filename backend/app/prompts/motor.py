MOTOR_EXTRACTION_PROMPT = '''
You are an expert Indian motor insurance analyst.
Extract the following details from the policy document text.
Return ONLY a valid JSON object. No explanation. No markdown.

{{
  "insurer_name":     "string — name of insurance company",
  "policy_type":      "string — 'Comprehensive' or 'Third Party'",
  "vehicle_make":     "string — manufacturer e.g. 'Maruti Suzuki'",
  "vehicle_model":    "string — model e.g. 'Swift Dzire'",
  "vehicle_variant":  "string — variant e.g. 'VXI'",
  "vehicle_type":     "string — 'suv', 'sedan', 'hatchback', 'two wheeler', 'luxury'",
  "vehicle_reg_year": "number — year of registration e.g. 2021",
  "policy_idv":       "number — Insured Declared Value in rupees as stated in policy",
  "ncb_percentage":   "number — No Claim Bonus percentage (0 if none)",
  "deductible":       "number — voluntary deductible amount in rupees (0 if none)",
  "add_ons": {{
    "zero_dep":        "boolean — true if Zero Depreciation / Zero Dep is present",
    "engine_protect":  "boolean — true if Engine Protection / Engine Protector is present",
    "rti":             "boolean — true if Return to Invoice is present",
    "ncb_protect":     "boolean — true if NCB Protection / NCB Protector is present",
    "consumables":     "boolean — true if Consumables cover is present",
    "tyre_protect":    "boolean — true if Tyre Protection is present",
    "roadside_assist": "boolean — true if Roadside Assistance is present"
  }},
  "financial_risks":  ["list of risks or concerns found in policy text"]
}}

If a field cannot be found, use null for strings, 0 for numbers, false for booleans.

Policy text:
{policy_text}
'''

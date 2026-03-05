from openai import AsyncOpenAI
import json
import os

def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    return AsyncOpenAI(api_key=api_key) if api_key else None

class MotorPolicyExtractor:
    async def extract(self, text: str) -> dict:
        client = get_client()
        if not client:
             return {"error": "OPENAI_API_KEY not set"}
        system_prompt = """You are a Motor Insurance Auditor. Extract the following details from the policy text:
        - vehicle_details: { make, model, variant, reg_year }
        - policy_type: 'Comprehensive' or 'Third Party'
        - idv: int
        - ncb: int
        - features: { zero_dep: bool, engine_protect: bool, rti: bool, consumables: bool }
        - financial_risks: List[str] (e.g. 'Voluntary Deductible applied')
        
        Return valid JSON only."""
        
        try:
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error extracting motor policy: {e}")
            return {}

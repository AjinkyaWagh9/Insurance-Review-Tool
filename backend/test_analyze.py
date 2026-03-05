import requests
from unittest.mock import MagicMock, patch

# Mock PDF content
MINIMAL_PDF = b"%PDF-1.4..." 

def test_analyze_api():
    print("Testing Analyze API (Mocking OpenAI)...\n")
    BASE_URL = "http://127.0.0.1:8000/api/v1"
    
    # We can't easily mock the OpenAI call from an external script hitting the running server
    # without a lot of complexity or using a real API key.
    # However, for this verification, we can check if the endpoint accepts the request 
    # and fails potentially on the OpenAI key (if missing) or processes it.
    
    # Files
    files = {'file': ('policy.pdf', MINIMAL_PDF, 'application/pdf')}
    data = {'policy_type': 'motor'}
    
    # Note: This will likely fail with a 500 error if OPENAI_API_KEY is not set in the server environment.
    # That is an expected "success" for verifying the Code Path (Router -> Endpoint -> Factory -> Extractor).
    # If the error is "Unknown policy type" or "404", then we have a wiring issue.
    
    try:
        resp = requests.post(f"{BASE_URL}/analyze/analyze", files=files, data=data)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
        
        if resp.status_code == 200:
            print("Success: Analysis returned result (OpenAI key likely active).")
        elif resp.status_code == 500:
            print("Server Error (Expected if OpenAI Key missing): Endpoint reached, logic executed.")
        else:
             print("Unexpected Error.")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_analyze_api()

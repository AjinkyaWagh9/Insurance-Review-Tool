import requests
import json
import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

class WhatsAppSendRequest(BaseModel):
    mobile: str
    file_url: str
    name: str
    filename: str = "Insurance_Review_Report"

@router.post("/send-document")
async def send_whatsapp_document(payload: WhatsAppSendRequest):
    url = "https://mediaapi.smsgupshup.com/GatewayAPI/rest"

    user_id = os.getenv("GUPSHUP_USERID") or "2000197678"
    pwd = os.getenv("GUPSHUP_PASSWORD") or "Fyvpudc4"
    
    mobile_num = payload.mobile

    # STEP 1: OPT-IN
    optin_payload = {
        "v": "1.1",
        "auth_scheme": "plain",
        "channel": "whatsapp",
        "format": "json",
        "method": "OPT_IN",
        "userid": user_id,
        "password": pwd,
        "phone_number": f"91{mobile_num}" if not mobile_num.startswith("91") else mobile_num
    }
    
    contact_phone = optin_payload["phone_number"]

    try:
        optin_res = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(optin_payload)
        )
        print("OPT-IN:", optin_res.text)
        
        if optin_res.status_code != 200:
            return JSONResponse(status_code=500, content={"success": False, "error": optin_res.text})

        # STEP 2: SEND DOCUMENT
        media_payload = {
            "v": "1.1",
            "format": "json",
            "method": "SENDMEDIAMESSAGE",
            "userid": user_id,
            "password": pwd,
            "send_to": contact_phone,
            "msg_type": "DOCUMENT",
            "media_url": payload.file_url,
            "filename": "Insurance_Review_Report",
            "caption": (
                "Hi 👋\n\n"
                "Your Insurance Policy Review Report is ready.\n\n"
                "This report highlights:\n"
                "✔ Your current coverage summary\n"
                "✔ Any hidden gaps in your policy\n"
                "✔ Suggestions to improve your protection\n\n"
                "If you'd like a quick explanation of the report, feel free to connect with your advisor.\n\n"
                "We're happy to help you make the most of your insurance coverage."
            )
        }

        media_res = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(media_payload)
        )
        print("SEND DOCUMENT:", media_res.text)
        
        # Gupshup API might return 200 but contains error in text
        if "error" in media_res.text.lower():
            return JSONResponse(status_code=400, content={"success": False, "response": media_res.text})

        return {"success": True, "response": media_res.text}
    
    except Exception as e:
        print(f"WhatsApp send error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

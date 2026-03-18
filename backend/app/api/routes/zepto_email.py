import smtplib
import os
import requests
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/email", tags=["email"])

class ZeptoEmailRequest(BaseModel):
    to_email: EmailStr
    customer_name: str
    pdf_url: str  # URL to download the PDF from

@router.post("/send-zepto-report")
async def send_zepto_report(payload: ZeptoEmailRequest):
    # SMTP Configuration (ZeptoMail)
    SMTP_HOST = "smtp.zeptomail.in"
    SMTP_PORT = 587
    SMTP_USER = "emailappsmtp.1ce934d7c87681af"
    SMTP_PASS = "2MLMNiYd7RcW"
    FROM_EMAIL = "noreply@bajajcapital.com"

    try:
        # 1. Create the message container
        msg = MIMEMultipart()
        msg["From"] = FROM_EMAIL
        msg["To"] = payload.to_email
        msg["Subject"] = "Your Insurance Policy Review Report is Ready"

        # 2. Create the body text
        body = f"""Dear {payload.customer_name},

Thank you for submitting your insurance policy for review.

Your Insurance Policy Review Report is now ready.

You can download your report attached below:

This report highlights:
• Your current coverage summary
• Any hidden gaps in your policy
• Suggestions to improve your protection

If you would like a quick explanation of the report or have any questions, please feel free to connect with your advisor.

We are happy to assist you in making the most of your insurance coverage.

Warm regards,
BajajCapital Insurance Broking Ltd"""

        msg.attach(MIMEText(body, "plain"))

        # 3. Handle PDF Attachment (Download from URL)
        try:
            # Added User-Agent and timeout to be more robust against CloudFront/S3 blocks
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(payload.pdf_url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                print(f"Successfully downloaded PDF. Size: {len(response.content)} bytes")
                part = MIMEBase("application", "octet-stream")
                part.set_payload(response.content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="Insurance_Review_Report.pdf"',
                )
                msg.attach(part)
            else:
                print(f"Failed to download PDF. Status: {response.status_code}, URL: {payload.pdf_url}")
        except Exception as pdf_err:
            print(f"Error attaching PDF: {pdf_err}")

        # 4. Connect to server and send
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()  # Upgrade connection to secure
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()

        return {"success": True, "message": "Email sent successfully via ZeptoMail"}

    except Exception as e:
        print(f"ZeptoMail error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

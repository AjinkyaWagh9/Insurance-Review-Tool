import boto3
import os
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv
from typing import Optional, Tuple

load_dotenv()
print("Access key:", os.getenv('AWS_ACCESS_KEY_ID'))
print("Secret key:", os.getenv('AWS_SECRET_ACCESS_KEY'))
print("Session token:", os.getenv('AWS_SESSION_TOKEN'))
print("Region:", os.getenv('AWS_REGION'))
print("Bucket name:", os.getenv('S3_BUCKET_NAME'))
print("Cloud URL:", os.getenv('S3_CLOUD_URL'))


class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('AWS_SESSION_TOKEN'),
            region_name=os.getenv('AWS_REGION', 'ap-south-1')
        )
        self.bucket_name = os.getenv('S3_BUCKET_NAME')
        self.cloud_url = os.getenv('S3_CLOUD_URL')

        print("Initialized S3Service with bucket:", self.bucket_name)
        print("Cloud URL:", self.cloud_url)

    def upload_pdf(self, pdf_content: bytes, filename: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Uploads a PDF to S3 and returns (url, error_message).
        """
        key = f"insurance-review-tool/{filename}"
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=pdf_content,
                ContentType='application/pdf',
                ContentDisposition='attachment; filename="Financial Health Report.pdf"',
                CacheControl='no-store'
            )
            
            url = f"{self.cloud_url}/{key}"
            return url, None
        except NoCredentialsError:
            error_msg = "AWS credentials not available or expired"
            print(error_msg)
            return None, error_msg
        except Exception as e:
            error_msg = f"S3 upload error: {str(e)}"
            print(error_msg)
            return None, error_msg

s3_service = S3Service()

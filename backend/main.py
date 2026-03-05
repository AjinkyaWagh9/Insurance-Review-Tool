from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import platform
from app.db.session import create_db_and_tables

# macOS Homebrew library path fix for WeasyPrint
_old_dyld_path = os.environ.get("DYLD_LIBRARY_PATH")
if platform.system() == "Darwin":
    # Search for Homebrew libraries
    hp_paths = ["/opt/homebrew/lib", "/usr/local/lib"]
    valid_paths = [p for p in hp_paths if os.path.exists(p)]
    if valid_paths:
        os.environ["DYLD_LIBRARY_PATH"] = ":".join(valid_paths) + (f":{_old_dyld_path}" if _old_dyld_path else "")

# Load environment variables
load_dotenv()

# Initialize Database
create_db_and_tables()

app = FastAPI(title="Insurance Review Tool API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from app.api.api import api_router
from app.api.endpoints.term import router as term_router
from app.api.routes.email import router as email_router
from app.api.routes.pdf import router as pdf_router
from app.api.routes.health_pdf import router as health_pdf_router
from app.api.routes.health_email import router as health_email_router
from app.api.routes.motor_email import router as motor_email_router
from app.api.routes.motor_pdf import router as motor_pdf_router

app.include_router(api_router, prefix="/api/v1")
app.include_router(term_router, prefix="/api/term", tags=["term"])
app.include_router(email_router)
app.include_router(pdf_router)
app.include_router(health_pdf_router)
app.include_router(health_email_router)
app.include_router(motor_email_router)
app.include_router(motor_pdf_router)

# Restore environment to avoid side effects (e.g. SSL conflicts)
if platform.system() == "Darwin":
    if _old_dyld_path is None:
        os.environ.pop("DYLD_LIBRARY_PATH", None)
    else:
        os.environ["DYLD_LIBRARY_PATH"] = _old_dyld_path

@app.get("/")
async def root():
    return {"message": "Welcome to Insurance Review Tool API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
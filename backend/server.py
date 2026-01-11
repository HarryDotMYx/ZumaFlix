from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import imaplib
import email
from email.header import decode_header
import re
import httpx
import asyncio
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global monitoring state
monitoring_task = None
is_monitoring = False

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Netflix Household Automation Service")
    yield
    # Shutdown
    global is_monitoring
    is_monitoring = False
    client.close()

# Create the main app
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============ Models ============

class IMAPConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password: str  # App password for Gmail
    imap_server: str = "imap.gmail.com"
    imap_port: int = 993
    polling_interval: int = 60  # seconds
    auto_click: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IMAPConfigCreate(BaseModel):
    email: str
    password: str
    imap_server: str = "imap.gmail.com"
    imap_port: int = 993
    polling_interval: int = 60
    auto_click: bool = True

class IMAPConfigResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    imap_server: str
    imap_port: int
    polling_interval: int
    auto_click: bool
    created_at: str
    updated_at: str

class EmailLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    sender: str
    received_at: datetime
    verification_link: Optional[str] = None
    status: str = "detected"  # detected, clicked, expired, error
    click_response: Optional[str] = None
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MonitoringStatus(BaseModel):
    is_running: bool
    last_check: Optional[str] = None
    emails_processed: int = 0
    links_clicked: int = 0
    errors: int = 0

class LogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    level: str
    message: str

# Global stats
stats = {
    "last_check": None,
    "emails_processed": 0,
    "links_clicked": 0,
    "errors": 0
}


# ============ IMAP Email Service ============

def connect_imap(config: dict):
    """Connect to IMAP server"""
    try:
        mail = imaplib.IMAP4_SSL(config['imap_server'], config['imap_port'])
        mail.login(config['email'], config['password'])
        return mail
    except Exception as e:
        logger.error(f"IMAP connection error: {e}")
        raise

def decode_email_subject(subject):
    """Decode email subject"""
    if subject is None:
        return ""
    decoded_parts = decode_header(subject)
    subject_str = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            subject_str += part.decode(encoding or 'utf-8', errors='ignore')
        else:
            subject_str += part
    return subject_str

def extract_verification_link(html_content: str) -> Optional[str]:
    """Extract Netflix verification link from email HTML"""
    # Look for the verification link pattern
    patterns = [
        r'href=["\']?(https://www\.netflix\.com/account/update-primary-location\?[^"\'>\s]+)["\']?',
        r'href=["\']?(https://www\.netflix\.com/account/household[^"\'>\s]*)["\']?',
        r'href=["\']?(https://www\.netflix\.com/[^"\'>\s]*update[^"\'>\s]*location[^"\'>\s]*)["\']?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, html_content, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None

def get_email_body(msg):
    """Extract email body from message"""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='ignore')
                    break
            elif content_type == "text/plain" and not body:
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='ignore')
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode('utf-8', errors='ignore')
    return body

async def click_verification_link(link: str) -> tuple[bool, str]:
    """Click the Netflix verification link"""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = await client.get(link, headers=headers)
            if response.status_code in [200, 302, 301]:
                return True, f"Success: Status {response.status_code}"
            else:
                return False, f"Failed: Status {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

async def check_netflix_emails(config: dict, auto_click: bool = True):
    """Check for Netflix household verification emails"""
    global stats
    
    try:
        mail = connect_imap(config)
        mail.select('INBOX')
        
        # Search for Netflix emails
        _, messages = mail.search(None, '(FROM "netflix")')
        email_ids = messages[0].split()
        
        # Process last 10 emails
        for email_id in email_ids[-10:]:
            _, msg_data = mail.fetch(email_id, '(RFC822)')
            
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject = decode_email_subject(msg['Subject'])
                    sender = msg['From']
                    date_str = msg['Date']
                    
                    # Check if this is a household verification email
                    household_keywords = ['household', 'update', 'location', 'device']
                    if any(kw in subject.lower() for kw in household_keywords):
                        body = get_email_body(msg)
                        link = extract_verification_link(body)
                        
                        # Check if already processed
                        existing = await db.email_logs.find_one({
                            "subject": subject,
                            "sender": sender
                        }, {"_id": 0})
                        
                        if not existing:
                            email_log = EmailLog(
                                subject=subject,
                                sender=sender,
                                received_at=datetime.now(timezone.utc),
                                verification_link=link,
                                status="detected"
                            )
                            
                            if link and auto_click:
                                success, response = await click_verification_link(link)
                                email_log.status = "clicked" if success else "error"
                                email_log.click_response = response
                                if success:
                                    stats["links_clicked"] += 1
                                else:
                                    stats["errors"] += 1
                            
                            # Save to database
                            doc = email_log.model_dump()
                            doc['received_at'] = doc['received_at'].isoformat()
                            doc['processed_at'] = doc['processed_at'].isoformat()
                            await db.email_logs.insert_one(doc)
                            
                            stats["emails_processed"] += 1
                            
                            # Log the action
                            await add_log("INFO", f"Processed Netflix email: {subject[:50]}...")
        
        mail.logout()
        stats["last_check"] = datetime.now(timezone.utc).isoformat()
        
    except Exception as e:
        logger.error(f"Error checking emails: {e}")
        stats["errors"] += 1
        await add_log("ERROR", f"Email check failed: {str(e)}")

async def monitoring_loop():
    """Background monitoring loop"""
    global is_monitoring, stats
    
    while is_monitoring:
        config = await db.imap_config.find_one({}, {"_id": 0})
        if config:
            await check_netflix_emails(config, config.get('auto_click', True))
            await asyncio.sleep(config.get('polling_interval', 60))
        else:
            await asyncio.sleep(10)

async def add_log(level: str, message: str):
    """Add a log entry to database"""
    log_entry = LogEntry(level=level, message=message)
    doc = log_entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.logs.insert_one(doc)


# ============ API Routes ============

@api_router.get("/")
async def root():
    return {"message": "Netflix Household Automation API"}

# IMAP Config Routes
@api_router.post("/config", response_model=IMAPConfigResponse)
async def create_or_update_config(config: IMAPConfigCreate):
    """Create or update IMAP configuration"""
    existing = await db.imap_config.find_one({}, {"_id": 0})
    
    if existing:
        update_data = config.model_dump()
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.imap_config.update_one({}, {"$set": update_data})
        updated = await db.imap_config.find_one({}, {"_id": 0})
        return IMAPConfigResponse(**updated)
    else:
        config_obj = IMAPConfig(**config.model_dump())
        doc = config_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.imap_config.insert_one(doc)
        return IMAPConfigResponse(**doc)

@api_router.get("/config", response_model=Optional[IMAPConfigResponse])
async def get_config():
    """Get current IMAP configuration"""
    config = await db.imap_config.find_one({}, {"_id": 0})
    if config:
        # Don't return password
        config['password'] = '********'
        return IMAPConfigResponse(**config)
    return None

@api_router.delete("/config")
async def delete_config():
    """Delete IMAP configuration"""
    await db.imap_config.delete_many({})
    return {"message": "Configuration deleted"}

@api_router.post("/config/test")
async def test_connection():
    """Test IMAP connection"""
    config = await db.imap_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="No configuration found")
    
    try:
        mail = connect_imap(config)
        mail.select('INBOX')
        mail.logout()
        await add_log("INFO", "IMAP connection test successful")
        return {"success": True, "message": "Connection successful"}
    except Exception as e:
        await add_log("ERROR", f"IMAP connection test failed: {str(e)}")
        return {"success": False, "message": str(e)}

# Email Logs Routes
@api_router.get("/emails", response_model=List[dict])
async def get_email_logs(limit: int = 50):
    """Get email logs history"""
    logs = await db.email_logs.find({}, {"_id": 0}).sort("processed_at", -1).limit(limit).to_list(limit)
    return logs

@api_router.delete("/emails")
async def clear_email_logs():
    """Clear email logs"""
    await db.email_logs.delete_many({})
    return {"message": "Email logs cleared"}

# Monitoring Routes
@api_router.get("/monitor/status", response_model=MonitoringStatus)
async def get_monitoring_status():
    """Get monitoring status"""
    global is_monitoring, stats
    return MonitoringStatus(
        is_running=is_monitoring,
        last_check=stats["last_check"],
        emails_processed=stats["emails_processed"],
        links_clicked=stats["links_clicked"],
        errors=stats["errors"]
    )

@api_router.post("/monitor/start")
async def start_monitoring(background_tasks: BackgroundTasks):
    """Start background monitoring"""
    global is_monitoring, monitoring_task
    
    config = await db.imap_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Please configure IMAP settings first")
    
    if not is_monitoring:
        is_monitoring = True
        background_tasks.add_task(monitoring_loop)
        await add_log("INFO", "Monitoring started")
        return {"message": "Monitoring started"}
    
    return {"message": "Monitoring already running"}

@api_router.post("/monitor/stop")
async def stop_monitoring():
    """Stop background monitoring"""
    global is_monitoring
    is_monitoring = False
    await add_log("INFO", "Monitoring stopped")
    return {"message": "Monitoring stopped"}

@api_router.post("/monitor/check-now")
async def check_now():
    """Manual check for Netflix emails"""
    config = await db.imap_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Please configure IMAP settings first")
    
    await check_netflix_emails(config, config.get('auto_click', True))
    await add_log("INFO", "Manual email check completed")
    return {"message": "Check completed", "stats": stats}

# Activity Logs Routes
@api_router.get("/logs", response_model=List[dict])
async def get_activity_logs(limit: int = 100):
    """Get activity logs"""
    logs = await db.logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

@api_router.delete("/logs")
async def clear_logs():
    """Clear activity logs"""
    await db.logs.delete_many({})
    return {"message": "Logs cleared"}

# Stats Routes
@api_router.get("/stats")
async def get_stats():
    """Get dashboard statistics"""
    total_emails = await db.email_logs.count_documents({})
    clicked_count = await db.email_logs.count_documents({"status": "clicked"})
    error_count = await db.email_logs.count_documents({"status": "error"})
    
    return {
        "total_emails": total_emails,
        "links_clicked": clicked_count,
        "errors": error_count,
        "is_monitoring": is_monitoring,
        "last_check": stats["last_check"]
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

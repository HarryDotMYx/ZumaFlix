from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
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
import secrets
import hashlib

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

# Admin credentials
ADMIN_USERNAME = "AdminZuma"
ADMIN_PASSWORD = "Zuma2925!"

# Global monitoring state
monitoring_task = None
is_monitoring = False

# Security
security = HTTPBasic()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials"""
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Netflix Household Automation Service")
    yield
    global is_monitoring
    is_monitoring = False
    client.close()

# Create the main app
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============ Models ============

class IMAPAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Account name/label
    email: str
    password: str  # App password for Gmail
    imap_server: str = "imap.gmail.com"
    imap_port: int = 993
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IMAPAccountCreate(BaseModel):
    name: str
    email: str
    password: str
    imap_server: str = "imap.gmail.com"
    imap_port: int = 993
    is_active: bool = True

class IMAPAccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    imap_server: str
    imap_port: int
    is_active: bool
    created_at: str
    updated_at: str

class MonitoringConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    polling_interval: int = 60
    auto_click: bool = True

class EmailLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_id: str
    account_name: str
    email_type: str  # "household_update" or "temporary_access"
    subject: str
    sender: str
    recipient: str  # The "Hi CK" name from email
    received_at: datetime
    verification_link: Optional[str] = None
    access_code: Optional[str] = None
    device_info: Optional[str] = None
    status: str = "detected"  # detected, clicked, expired, error
    click_response: Optional[str] = None
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_body: Optional[str] = None

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

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str

# Global stats
stats = {
    "last_check": None,
    "emails_processed": 0,
    "links_clicked": 0,
    "errors": 0
}

# Session tokens (simple in-memory for this use case)
active_sessions = {}


# ============ Auth Functions ============

def generate_token():
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


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
    patterns = [
        r'href=["\']?(https://www\.netflix\.com/account/update-primary-location\?[^"\'>\s]+)["\']?',
        r'href=["\']?(https://www\.netflix\.com/account/household[^"\'>\s]*)["\']?',
        r'href=["\']?(https://www\.netflix\.com/[^"\'>\s]*update[^"\'>\s]*location[^"\'>\s]*)["\']?',
        r'href=["\']?(https://www\.netflix\.com/account/travel/[^"\'>\s]*)["\']?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, html_content, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None

def extract_access_code(html_content: str) -> Optional[str]:
    """Extract temporary access code from email"""
    # Look for 6-digit codes
    pattern = r'\b(\d{6})\b'
    matches = re.findall(pattern, html_content)
    if matches:
        return matches[0]
    return None

def extract_recipient_name(html_content: str) -> str:
    """Extract the recipient name from 'Hi CK,' pattern"""
    pattern = r'Hi\s+([^,\n<]+)'
    match = re.search(pattern, html_content)
    if match:
        return match.group(1).strip()
    return "Unknown"

def extract_device_info(html_content: str) -> Optional[str]:
    """Extract device info from temporary access email"""
    pattern = r'device[^:]*:?\s*([^\n<]+)'
    match = re.search(pattern, html_content, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None

def detect_email_type(subject: str, body: str) -> str:
    """Detect Netflix email type"""
    subject_lower = subject.lower()
    body_lower = body.lower()
    
    # Temporary access code detection
    if any(kw in subject_lower for kw in ['temporary access', 'access code', 'temporary code']):
        return "temporary_access"
    if any(kw in body_lower for kw in ['temporary access code', 'get a temporary access code']):
        return "temporary_access"
    
    # Household update detection
    household_keywords = [
        'household', 'update your netflix', 'update netflix', 
        'primary location', 'this was me', 'yes, this was me',
        'update the netflix household', 'netflix household'
    ]
    if any(kw in subject_lower for kw in household_keywords):
        return "household_update"
    if any(kw in body_lower for kw in household_keywords):
        return "household_update"
    
    return "other"

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
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as http_client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = await http_client.get(link, headers=headers)
            if response.status_code in [200, 302, 301]:
                return True, f"Success: Status {response.status_code}"
            else:
                return False, f"Failed: Status {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

async def check_netflix_emails_for_account(account: dict, auto_click: bool = True):
    """Check Netflix emails for a single account"""
    global stats
    
    try:
        mail = connect_imap(account)
        mail.select('INBOX')
        
        # Search for Netflix emails (both read and unread)
        # Try multiple search patterns
        search_patterns = [
            '(FROM "netflix.com")',
            '(FROM "netflix")',
            '(FROM "account.netflix.com")',
        ]
        
        all_email_ids = set()
        for pattern in search_patterns:
            try:
                _, messages = mail.search(None, pattern)
                if messages[0]:
                    all_email_ids.update(messages[0].split())
            except:
                pass
        
        email_ids = list(all_email_ids)
        logger.info(f"[{account['name']}] Found {len(email_ids)} Netflix emails")
        
        # Process last 30 emails
        for email_id in email_ids[-30:]:
            try:
                _, msg_data = mail.fetch(email_id, '(RFC822)')
                
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        subject = decode_email_subject(msg['Subject'])
                        sender = msg['From']
                        message_id = msg.get('Message-ID', '')
                        
                        body = get_email_body(msg)
                        email_type = detect_email_type(subject, body)
                        
                        # Only process household and temporary access emails
                        if email_type in ["household_update", "temporary_access"]:
                            # Check if already processed using message_id or subject+sender combo
                            existing = await db.email_logs.find_one({
                                "$or": [
                                    {"message_id": message_id} if message_id else {"_id": None},
                                    {"account_id": account['id'], "subject": subject, "sender": sender}
                                ]
                            }, {"_id": 0})
                            
                            if not existing:
                                recipient_name = extract_recipient_name(body)
                                link = extract_verification_link(body)
                                access_code = extract_access_code(body) if email_type == "temporary_access" else None
                                device_info = extract_device_info(body) if email_type == "temporary_access" else None
                                
                                email_log = EmailLog(
                                    account_id=account['id'],
                                    account_name=account['name'],
                                    email_type=email_type,
                                    subject=subject,
                                    sender=sender,
                                    recipient=recipient_name,
                                    received_at=datetime.now(timezone.utc),
                                    verification_link=link,
                                    access_code=access_code,
                                    device_info=device_info,
                                    status="detected",
                                    raw_body=body[:2000]  # Store first 2000 chars
                                )
                                
                                # Auto-click for household updates only
                                if link and auto_click and email_type == "household_update":
                                    success, response = await click_verification_link(link)
                                    email_log.status = "clicked" if success else "error"
                                    email_log.click_response = response
                                    if success:
                                        stats["links_clicked"] += 1
                                        logger.info(f"[{account['name']}] Auto-clicked verification link!")
                                    else:
                                        stats["errors"] += 1
                                
                                # Save to database
                                doc = email_log.model_dump()
                                doc['received_at'] = doc['received_at'].isoformat()
                                doc['processed_at'] = doc['processed_at'].isoformat()
                                doc['message_id'] = message_id
                                await db.email_logs.insert_one(doc)
                                
                                stats["emails_processed"] += 1
                                await add_log("INFO", f"[{account['name']}] NEW: {subject[:50]}...")
                                logger.info(f"[{account['name']}] Processed new email: {subject[:50]}...")
            except Exception as e:
                logger.error(f"Error processing email: {e}")
                continue
        
        mail.logout()
        
    except Exception as e:
        logger.error(f"Error checking emails for {account.get('name', 'unknown')}: {e}")
        stats["errors"] += 1
        await add_log("ERROR", f"[{account.get('name', 'unknown')}] Check failed: {str(e)}")

async def check_all_accounts():
    """Check Netflix emails for all active accounts"""
    global stats
    
    accounts = await db.imap_accounts.find({"is_active": True}, {"_id": 0}).to_list(100)
    config = await db.monitoring_config.find_one({}, {"_id": 0})
    auto_click = config.get('auto_click', True) if config else True
    
    for account in accounts:
        await check_netflix_emails_for_account(account, auto_click)
    
    stats["last_check"] = datetime.now(timezone.utc).isoformat()

async def monitoring_loop():
    """Background monitoring loop"""
    global is_monitoring, stats
    
    while is_monitoring:
        config = await db.monitoring_config.find_one({}, {"_id": 0})
        polling_interval = config.get('polling_interval', 60) if config else 60
        
        accounts = await db.imap_accounts.find({"is_active": True}, {"_id": 0}).to_list(100)
        if accounts:
            await check_all_accounts()
        
        await asyncio.sleep(polling_interval)

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

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Admin login"""
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        token = generate_token()
        active_sessions[hash_token(token)] = {
            "username": request.username,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        return LoginResponse(success=True, token=token, message="Login successful")
    return LoginResponse(success=False, message="Invalid credentials")

@api_router.post("/auth/verify")
async def verify_token(token: str = ""):
    """Verify admin token"""
    if not token:
        return {"valid": False}
    hashed = hash_token(token)
    if hashed in active_sessions:
        return {"valid": True, "username": active_sessions[hashed]["username"]}
    return {"valid": False}

@api_router.post("/auth/logout")
async def logout(token: str = ""):
    """Logout and invalidate token"""
    if token:
        hashed = hash_token(token)
        if hashed in active_sessions:
            del active_sessions[hashed]
    return {"success": True}

# IMAP Accounts Routes (Admin only)
@api_router.post("/accounts", response_model=IMAPAccountResponse)
async def create_account(account: IMAPAccountCreate):
    """Create new IMAP account"""
    account_obj = IMAPAccount(**account.model_dump())
    doc = account_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.imap_accounts.insert_one(doc)
    return IMAPAccountResponse(**doc)

@api_router.get("/accounts", response_model=List[IMAPAccountResponse])
async def get_accounts():
    """Get all IMAP accounts"""
    accounts = await db.imap_accounts.find({}, {"_id": 0}).to_list(100)
    # Mask passwords
    for acc in accounts:
        acc['password'] = '********'
    return [IMAPAccountResponse(**acc) for acc in accounts]

@api_router.get("/accounts/{account_id}", response_model=IMAPAccountResponse)
async def get_account(account_id: str):
    """Get single IMAP account"""
    account = await db.imap_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account['password'] = '********'
    return IMAPAccountResponse(**account)

@api_router.put("/accounts/{account_id}", response_model=IMAPAccountResponse)
async def update_account(account_id: str, account: IMAPAccountCreate):
    """Update IMAP account"""
    existing = await db.imap_accounts.find_one({"id": account_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = account.model_dump()
    # Keep existing password if new one is empty
    if not update_data.get('password'):
        update_data['password'] = existing['password']
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.imap_accounts.update_one({"id": account_id}, {"$set": update_data})
    
    # Update account_name in all email_logs for this account
    if update_data['name'] != existing.get('name'):
        await db.email_logs.update_many(
            {"account_id": account_id},
            {"$set": {"account_name": update_data['name']}}
        )
        await add_log("INFO", f"Updated account name from '{existing.get('name')}' to '{update_data['name']}'")
    
    updated = await db.imap_accounts.find_one({"id": account_id}, {"_id": 0})
    return IMAPAccountResponse(**updated)

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    """Delete IMAP account"""
    result = await db.imap_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted"}

@api_router.post("/accounts/{account_id}/test")
async def test_account_connection(account_id: str):
    """Test IMAP connection for account"""
    account = await db.imap_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        mail = connect_imap(account)
        mail.select('INBOX')
        mail.logout()
        await add_log("INFO", f"[{account['name']}] Connection test successful")
        return {"success": True, "message": "Connection successful"}
    except Exception as e:
        await add_log("ERROR", f"[{account['name']}] Connection test failed: {str(e)}")
        return {"success": False, "message": str(e)}

# Monitoring Config Routes
@api_router.get("/config/monitoring")
async def get_monitoring_config():
    """Get monitoring configuration"""
    config = await db.monitoring_config.find_one({}, {"_id": 0})
    if not config:
        return {"polling_interval": 60, "auto_click": True}
    return config

@api_router.post("/config/monitoring")
async def update_monitoring_config(config: MonitoringConfig):
    """Update monitoring configuration"""
    existing = await db.monitoring_config.find_one({}, {"_id": 0})
    if existing:
        await db.monitoring_config.update_one({}, {"$set": config.model_dump()})
    else:
        await db.monitoring_config.insert_one(config.model_dump())
    return config

# Email Logs Routes (Public for guests)
@api_router.get("/emails", response_model=List[dict])
async def get_email_logs(limit: int = 100, email_type: Optional[str] = None):
    """Get email logs history - accessible to guests"""
    query = {}
    if email_type:
        query["email_type"] = email_type
    
    logs = await db.email_logs.find(query, {"_id": 0, "raw_body": 0}).sort("processed_at", -1).limit(limit).to_list(limit)
    return logs

@api_router.get("/emails/{email_id}")
async def get_email_detail(email_id: str):
    """Get single email detail"""
    email_log = await db.email_logs.find_one({"id": email_id}, {"_id": 0})
    if not email_log:
        raise HTTPException(status_code=404, detail="Email not found")
    return email_log

@api_router.delete("/emails")
async def clear_email_logs():
    """Clear email logs (admin only)"""
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
    global is_monitoring
    
    accounts = await db.imap_accounts.find({"is_active": True}, {"_id": 0}).to_list(100)
    if not accounts:
        raise HTTPException(status_code=400, detail="Please add at least one email account first")
    
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
    accounts = await db.imap_accounts.find({"is_active": True}, {"_id": 0}).to_list(100)
    if not accounts:
        raise HTTPException(status_code=400, detail="Please add at least one email account first")
    
    await check_all_accounts()
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
    household_count = await db.email_logs.count_documents({"email_type": "household_update"})
    access_code_count = await db.email_logs.count_documents({"email_type": "temporary_access"})
    active_accounts = await db.imap_accounts.count_documents({"is_active": True})
    
    return {
        "total_emails": total_emails,
        "links_clicked": clicked_count,
        "errors": error_count,
        "household_emails": household_count,
        "access_code_emails": access_code_count,
        "active_accounts": active_accounts,
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

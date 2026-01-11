# ZumaFLIX - Netflix Household Email Automation

Automatically monitors your Gmail inbox for Netflix household verification emails and clicks the "Yes, this was me" link before it expires.

![ZumaFLIX](https://img.shields.io/badge/ZumaFLIX-v1.0-E50914?style=for-the-badge)

## Features

- 🔐 **Admin Authentication** - Secure login for dashboard access
- 📧 **Multiple Email Accounts** - Monitor multiple Gmail accounts simultaneously
- 🏠 **Household Update Detection** - Auto-clicks "Yes, this was me" verification links
- 🔑 **Temporary Access Codes** - Captures and displays Netflix temporary access codes
- ⚡ **Real-time Monitoring** - Background polling with configurable intervals
- 📊 **Dashboard** - View stats, logs, and control monitoring
- 👀 **Guest View** - Public email history page (no login required)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Gmail Setup](#gmail-setup)
5. [Running the Application](#running-the-application)
6. [Usage](#usage)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+**
- **Node.js 18+** and **Yarn**
- **MongoDB 6.0+**
- **Git**

### Verify Installation

```bash
python3 --version    # Should be 3.11+
node --version       # Should be 18+
yarn --version       # Should be 1.22+
mongod --version     # Should be 6.0+
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/zumaflix.git
cd zumaflix
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies (use one of these methods)

# Method 1: Using npm (Recommended if yarn has issues)
npm install

# Method 2: Using yarn (if properly installed)
yarn install

# Method 3: If yarn command fails, reinstall yarn first
npm install -g yarn
yarn install
```

#### Troubleshooting Yarn Issues

If you see errors like `ERROR: There are no scenarios` or `No such file or directory: 'install'`:

```bash
# Check if yarn is properly installed
which yarn
yarn --version

# If yarn is broken, reinstall it:
npm uninstall -g yarn
npm install -g yarn

# Or use npm instead (works the same):
npm install
npm start
```

### 4. Database Setup

```bash
# Start MongoDB (if not running as a service)
mongod --dbpath /path/to/your/data

# Or using Docker:
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

---

## Configuration

### Backend Environment Variables

Create `/backend/.env` file:

```env
# MongoDB Connection
MONGO_URL="mongodb://localhost:27017"
DB_NAME="zumaflix_db"

# CORS Settings
CORS_ORIGINS="http://localhost:3000"
```

### Frontend Environment Variables

Create `/frontend/.env` file:

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001

# WebSocket Port (for development)
WDS_SOCKET_PORT=443
```

### Admin Credentials

Default admin credentials (hardcoded in `server.py`):

| Field    | Value       |
|----------|-------------|
| Username | `AdminZuma` |
| Password | `Zuma2925!` |

To change credentials, edit `/backend/server.py`:

```python
# Line 35-36
ADMIN_USERNAME = "YourUsername"
ADMIN_PASSWORD = "YourPassword"
```

---

## Gmail Setup

### Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**

### Step 2: Generate App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "ZumaFLIX"
4. Click **Generate**
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Enable IMAP

1. Go to [Gmail Settings](https://mail.google.com/mail/u/0/#settings/fwdandpop)
2. Click **Forwarding and POP/IMAP** tab
3. Enable **IMAP Access**
4. Save Changes

---

## Running the Application

### Option 1: Development Mode (Separate Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend

# Using npm:
npm start

# Or using yarn:
yarn start
```

### Option 2: Using Supervisor (Production)

Create `/etc/supervisor/conf.d/zumaflix.conf`:

```ini
[program:zumaflix-backend]
command=/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/zumaflix/backend.err.log
stdout_logfile=/var/log/zumaflix/backend.out.log

[program:zumaflix-frontend]
command=yarn start
directory=/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/zumaflix/frontend.err.log
stdout_logfile=/var/log/zumaflix/frontend.out.log
environment=PORT=3000
```

Start services:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start zumaflix-backend zumaflix-frontend
```

### Option 3: Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=zumaflix_db
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    depends_on:
      - backend

volumes:
  mongodb_data:
```

Run:
```bash
docker-compose up -d
```

---

## Usage

### Access URLs

| Page | URL | Access |
|------|-----|--------|
| Email History (Guest) | `http://localhost:3000/` | Public |
| Admin Login | `http://localhost:3000/login` | Public |
| Admin Dashboard | `http://localhost:3000/admin` | Admin Only |
| Admin Settings | `http://localhost:3000/admin/settings` | Admin Only |

### First-Time Setup

1. **Login as Admin**
   - Go to `http://localhost:3000/login`
   - Enter: `AdminZuma` / `Zuma2925!`

2. **Add Email Account**
   - Navigate to **Settings**
   - Click **Add Account**
   - Fill in:
     - **Account Name**: e.g., "Personal Gmail"
     - **Email**: your.email@gmail.com
     - **App Password**: (16-char password from Gmail)
     - **IMAP Server**: imap.gmail.com
     - **Port**: 993
   - Click **Save Account**

3. **Test Connection**
   - Click the **Test** button next to your account
   - Should show "Connection successful!"

4. **Configure Monitoring**
   - Set **Polling Interval** (default: 60 seconds)
   - Enable/disable **Auto-Click Household Links**
   - Click **Save Monitoring Settings**

5. **Start Monitoring**
   - Go to **Dashboard**
   - Click **Start** button
   - Status indicator should turn green

### Manual Check

Click **Check Now** on the Dashboard to immediately scan for Netflix emails.

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/verify` | POST | Verify token |
| `/api/auth/logout` | POST | Logout |

### Email Accounts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/accounts` | GET | List all accounts |
| `/api/accounts` | POST | Create account |
| `/api/accounts/{id}` | PUT | Update account |
| `/api/accounts/{id}` | DELETE | Delete account |
| `/api/accounts/{id}/test` | POST | Test connection |

### Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monitor/status` | GET | Get monitoring status |
| `/api/monitor/start` | POST | Start monitoring |
| `/api/monitor/stop` | POST | Stop monitoring |
| `/api/monitor/check-now` | POST | Manual email check |

### Email Logs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/emails` | GET | Get email history |
| `/api/emails/{id}` | GET | Get email details |
| `/api/emails` | DELETE | Clear all logs |

### Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Dashboard statistics |
| `/api/logs` | GET | Activity logs |

---

## Troubleshooting

### Common Issues

#### 1. IMAP Connection Failed

**Error:** `Authentication failed`

**Solution:**
- Verify you're using an **App Password**, not your regular Gmail password
- Ensure 2FA is enabled on your Google account
- Check IMAP is enabled in Gmail settings

#### 2. MongoDB Connection Error

**Error:** `ServerSelectionTimeoutError`

**Solution:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod
```

#### 3. Frontend Can't Connect to Backend

**Error:** `Network Error` or `CORS error`

**Solution:**
- Verify backend is running on port 8001
- Check `REACT_APP_BACKEND_URL` in frontend `.env`
- Ensure CORS_ORIGINS includes frontend URL

#### 4. Emails Not Being Detected

**Possible Causes:**
- Netflix emails might be in Spam/Promotions folder
- Email subject doesn't match detection patterns
- Account is not active

**Solution:**
- Move Netflix emails to Primary inbox
- Check account is marked as "Active" in Settings
- Review activity logs for errors

### Logs Location

```bash
# Backend logs
tail -f /var/log/supervisor/backend.err.log

# Frontend logs  
tail -f /var/log/supervisor/frontend.err.log

# Or check in-app Activity Log on Dashboard
```

---

## Project Structure

```
zumaflix/
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # Auth context
│   │   ├── App.js         # Main app component
│   │   └── index.css      # Global styles
│   ├── package.json       # Node dependencies
│   └── .env               # Environment variables
├── docker-compose.yml     # Docker configuration
└── README.md              # This file
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change default admin credentials** before deploying to production
2. **Use HTTPS** in production environments
3. **Store App Passwords securely** - they provide full email access
4. **Restrict CORS origins** to your specific domain
5. **Use environment variables** for all sensitive data

---

## License

MIT License - See LICENSE file for details.

---

## Support

For issues and feature requests, please open a GitHub issue.

---

**Made By HarryDotMYx**

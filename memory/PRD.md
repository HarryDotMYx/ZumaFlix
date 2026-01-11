# Netflix Household Email Automation - PRD

## Original Problem Statement
A Script to Automate Netflix Household from an Email Mailbox. This application monitors an IMAP mailbox for emails from Netflix links and automatically clicks the "Yes, this was me" verification link for household updates.

## User Choices
- Email Provider: Gmail (IMAP)
- Action on Detection: Automatically click/follow the verification link
- Monitoring: Both real-time polling and manual trigger
- Dashboard Features: IMAP credentials config, email history view
- Admin Access: Username: AdminZuma, Password: Zuma2925!
- Role-based Access: Admin (Dashboard+Settings) vs Guest (Email History only)
- Multiple email accounts support
- Two email types: Household Update + Temporary Access Code

## Architecture
- **Backend**: FastAPI (Python) with Motor (async MongoDB)
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Database**: MongoDB
- **Email**: IMAP library for Gmail integration
- **HTTP Client**: httpx for clicking verification links
- **Auth**: Session-based token authentication

## Core Requirements
1. Monitor Gmail IMAP inbox for Netflix household verification emails
2. Parse emails and extract "Yes, this was me" verification links
3. Automatically click verification links (or manual trigger)
4. Web dashboard for configuration and monitoring
5. Email history with status tracking
6. Support multiple email accounts
7. Support both email types: Household updates + Temporary access codes

## What's Been Implemented (January 2026)

### Backend APIs
- `/api/auth/login` - Admin login
- `/api/auth/verify` - Token verification
- `/api/auth/logout` - Logout
- `/api/accounts` - CRUD for IMAP accounts (multiple)
- `/api/accounts/{id}/test` - Test IMAP connection
- `/api/config/monitoring` - Polling interval & auto-click settings
- `/api/emails` - Email logs history with type filter
- `/api/monitor/status` - Monitoring status
- `/api/monitor/start` - Start background polling
- `/api/monitor/stop` - Stop monitoring
- `/api/monitor/check-now` - Manual email check
- `/api/logs` - Activity logs
- `/api/stats` - Dashboard statistics

### Frontend Pages
- **Guest Email History** (`/`): Public view of detected Netflix emails with type filter
- **Admin Login** (`/login`): Username/password authentication
- **Admin Dashboard** (`/admin`): Control center with stats, monitoring controls
- **Admin Settings** (`/admin/settings`): Multiple email account management, monitoring config

### Email Types Supported
1. **Household Update**: "Did you request to update your Netflix household?" - Auto-clicks "Yes, this was me" link
2. **Temporary Access Code**: "Your Netflix temporary access code" - Displays 6-digit code

### Design Theme
- "Netflix Ops Control" dark theme
- Colors: Void Black (#050505), Netflix Red (#E50914)
- Fonts: Chivo (headings), Manrope (body), JetBrains Mono (data)

## P0 - Implemented ✅
- [x] Admin authentication (AdminZuma/Zuma2925!)
- [x] Role-based access (Admin vs Guest)
- [x] Multiple email accounts support
- [x] IMAP email monitoring
- [x] Netflix email detection (both types)
- [x] Verification link extraction & auto-click
- [x] Temporary access code extraction
- [x] Dashboard with stats
- [x] Email history with filtering
- [x] Settings with account management

## P1 - Next Phase
- [ ] Email notifications when links are clicked
- [ ] Webhook notifications
- [ ] Email filtering rules by sender/subject

## P2 - Future Enhancements
- [ ] Statistics charts/graphs
- [ ] Export email history
- [ ] Dark/light theme toggle

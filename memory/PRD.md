# Netflix Household Email Automation - PRD

## Original Problem Statement
A Script to Automate Netflix Household from an Email Mailbox. This application monitors an IMAP mailbox for emails from Netflix links and automatically clicks the "Yes, this was me" verification link for household updates.

## User Choices
- Email Provider: Gmail (IMAP)
- Action on Detection: Automatically click/follow the verification link
- Monitoring: Both real-time polling and manual trigger
- Dashboard Features: IMAP credentials config, email history view

## Architecture
- **Backend**: FastAPI (Python) with Motor (async MongoDB)
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Database**: MongoDB
- **Email**: IMAP library for Gmail integration
- **HTTP Client**: httpx for clicking verification links

## Core Requirements
1. Monitor Gmail IMAP inbox for Netflix household verification emails
2. Parse emails and extract "Yes, this was me" verification links
3. Automatically click verification links (or manual trigger)
4. Web dashboard for configuration and monitoring
5. Email history with status tracking

## What's Been Implemented (December 2025)

### Backend APIs
- `/api/config` - CRUD for IMAP configuration
- `/api/config/test` - Test IMAP connection
- `/api/emails` - Email logs history
- `/api/monitor/status` - Monitoring status
- `/api/monitor/start` - Start background polling
- `/api/monitor/stop` - Stop monitoring
- `/api/monitor/check-now` - Manual email check
- `/api/logs` - Activity logs
- `/api/stats` - Dashboard statistics

### Frontend Pages
- **Dashboard**: Control center with stats, monitoring controls, activity log, recent emails
- **Settings**: IMAP configuration form with Gmail setup instructions
- **History**: Email history with status badges and verification links

### Design Theme
- "Netflix Ops Control" dark theme
- Colors: Void Black (#050505), Netflix Red (#E50914)
- Fonts: Chivo (headings), Manrope (body), JetBrains Mono (data)

## P0 - Implemented ✅
- [x] IMAP email monitoring
- [x] Netflix email detection
- [x] Verification link extraction
- [x] Auto-click functionality
- [x] Dashboard with stats
- [x] Settings configuration
- [x] Email history

## P1 - Next Phase
- [ ] Email notifications when links are clicked
- [ ] Multiple email account support
- [ ] Webhook notifications
- [ ] Email filtering rules

## P2 - Future Enhancements
- [ ] Mobile-responsive improvements
- [ ] Dark/light theme toggle
- [ ] Export email history
- [ ] Statistics charts/graphs

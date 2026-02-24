# 📘 SPEC.md  
## Telegram Expense Tracker – Web Dashboard

---

## 1. Overview

### 1.1 Objective

Build a web-based personal expense management system that:

- Collects expenses from Telegram Bot messages.
- Automatically parses messages into structured expense records.
- Provides a dashboard for analytics and reporting.
- Allows manual review and editing.
- Supports secure multi-user access.

### 1.2 Target Users

- Individuals or small groups using Telegram.
- Main flow: Send message → Auto record → View report on web.

### 1.3 Out of Scope (V1)

- OCR / receipt scanning
- Bank integrations
- Advanced multi-currency
- Native mobile apps

---

## 2. Functional Requirements

### 2.1 Telegram Integration

- Provide a Telegram Bot for receiving expense messages.
- Store raw payload and parse data.
- Prevent duplicates (chat_id + message_id).

### 2.2 Message Parsing

Supported formats:

coffee 45k  
ăn sáng 35k  
#food ăn trưa 65k  
2026-02-23 cafe 45k  

Units: k, tr, đ, vnd

### 2.3 Confidence & Status

- CONFIRMED
- PENDING_REVIEW
- UNPARSED
- DELETED

### 2.4 Dashboard

- Monthly total
- Daily/weekly/monthly stats
- Charts by category
- Recent expenses

### 2.5 Authentication

- Email/password
- Telegram linking via /link CODE
- Per-user isolation

---

## 3. Non-Functional Requirements

- Secure auth
- Idempotent webhook
- Performance
- Logging
- Token safety

---

## 4. Architecture

Stack:
- Next.js
- Prisma
- PostgreSQL
- Recharts

Flow:
Telegram → Webhook → Parser → DB → API → Frontend

---

## 5. Database Schema

Tables:
- users
- telegram_identities
- telegram_messages
- categories
- expenses
- audit_logs (optional)

---

## 6. API

Base: /api

Auth:
- /auth/register
- /auth/login

Expenses:
- GET /expenses
- POST /expenses
- PATCH /expenses/:id
- DELETE /expenses/:id

Dashboard:
- GET /dashboard/summary

---

## 7. Parser

Steps:
1. Normalize
2. Extract tags
3. Extract category/wallet
4. Extract date
5. Extract amount
6. Build description
7. Score confidence
8. Assign status

Regex amount:
(\d+[.,]?\d*)\s*(k|tr|m|đ|vnd|vnđ)?

---

## 8. Security

- Webhook secret
- JWT
- Ownership checks

---

## 9. Frontend

Pages:
- /login
- /dashboard
- /expenses
- /categories
- /settings

---

## 10. Testing

- Unit parser tests
- Integration webhook tests
- E2E flows

---

## 11. Deployment

Env:
DATABASE_URL  
JWT_SECRET  
TELEGRAM_BOT_TOKEN  
TELEGRAM_WEBHOOK_SECRET  

---

# END

# Telegram Expense Tracker Web Dashboard

Next.js App Router + Prisma + PostgreSQL (Supabase compatible) dashboard for personal expense tracking via Telegram bot messages.

## Stack

- Next.js (App Router, TypeScript)
- Prisma ORM + PostgreSQL / Supabase
- Custom JWT auth (email/password + bcryptjs)
- Recharts (dashboard + compare charts)
- Heroicons (`@heroicons/react`)
- Docker / docker-compose

## Current Features

- Auth: register/login/logout
- Telegram link flow (`/settings`, `POST /api/telegram/link`)
- Telegram webhook ingestion (`POST /api/telegram/webhook/:secret`)
- Expenses:
  - list + filters + pagination
  - quick change category/wallet/status
  - Bill ID column + detail modal
  - bulk confirm/delete in review queue
  - Excel export
  - search by text and Bill ID
- Categories:
  - CRUD
  - quick color update + color palette
  - pagination
- Dashboard:
  - KPI cards
  - daily trend chart
  - category pie chart
- Compare Months (`/compare`):
  - compare 2 months
  - KPI summary + delta
  - category grouped vertical bar chart
  - category delta table
- Notifications:
  - dropdown list
  - bell ring animation when unread > 0
  - detail modal for notification expense
- Global toast notifications for data mutation actions (success/error/info)
- Admin tools:
  - user manager
  - DB import/export (JSON)
  - SQL export via pg_dump endpoint

## Routes (UI)

- `/login`
- `/dashboard`
- `/expenses`
- `/categories`
- `/compare`
- `/settings`
- `/user-manager` (admin)

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/dashboard/summary`
- `GET /api/expenses`
- `POST /api/expenses`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `POST /api/telegram/link`
- `POST /api/telegram/webhook/:secret`
- `GET /api/notifications`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/db-export`
- `GET /api/admin/db-export-pgdump`
- `POST /api/admin/db-import`
- `POST /api/deletedb`

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy env

```bash
cp .env.example .env
```

3. Configure DB connection (`DATABASE_URL`, optional `DIRECT_URL`)

4. Prisma generate + migrate

```bash
npm run prisma:generate
npm run prisma:deploy
```

For local development migration:

```bash
npm run prisma:migrate
```

5. Seed demo/default data

```bash
npm run prisma:seed
```

6. Start app

```bash
npm run dev
```

## Docker

```bash
docker compose up --build
```

App runs on `http://localhost:3000`.

## Telegram Setup

1. Create bot via BotFather and get `TELEGRAM_BOT_TOKEN`.
2. Set `TELEGRAM_WEBHOOK_SECRET`.
3. Set webhook URL:

```text
https://<your-domain>/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
```

Example:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$NEXT_PUBLIC_BASE_URL/api/telegram/webhook/$TELEGRAM_WEBHOOK_SECRET\"}"
```

## Notes

- `TELEGRAM_BOT_TOKEN` is server-side only.
- If secrets are leaked, rotate immediately.
- If you change Prisma schema, always run `npm run prisma:generate` before restart/build.

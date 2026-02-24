# Telegram Expense Tracker Web Dashboard

Next.js App Router + Prisma + PostgreSQL (Supabase compatible) dashboard for personal expense tracking via Telegram bot messages.

## Stack (implemented)

- Next.js (App Router, TypeScript)
- Prisma ORM + PostgreSQL / Supabase
- Custom JWT auth (email/password + bcryptjs)
- Recharts (dashboard charts)
- Docker / docker-compose

## Features included

- Telegram webhook endpoint: `POST /api/telegram/webhook/<SECRET>`
- Idempotent Telegram message storage with unique `(chat_id, message_id)`
- Telegram linking flow (`POST /api/telegram/link`, bot `/link CODE`)
- Parser with confidence + status (`CONFIRMED`, `PENDING_REVIEW`, `UNPARSED`, `DELETED`)
- Expenses CRUD API + soft delete
- Categories CRUD API
- Dashboard summary API
- UI pages: `/login`, `/dashboard`, `/expenses`, `/categories`, `/settings`
- Parser unit tests (Vitest)
- Supabase optional RLS policy SQL

## Project setup

1. Install dependencies

```bash
npm install
```

2. Copy env

```bash
cp .env.example .env
```

3. Set database connection (`DATABASE_URL`) to Supabase Postgres

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
```

4. Generate Prisma client and run migration

```bash
npx prisma generate
npx prisma migrate deploy
```

For local development migration:

```bash
npx prisma migrate dev
```

5. Seed default categories/demo user

```bash
npm run prisma:seed
```

6. Start app

```bash
npm run dev
```

## Docker

Build and run:

```bash
docker compose up --build
```

App runs on `http://localhost:3000`.

## Telegram setup

1. Create a bot via BotFather and get `TELEGRAM_BOT_TOKEN`.
2. Set `TELEGRAM_WEBHOOK_SECRET` (random string).
3. Configure webhook URL:

```text
https://<your-domain>/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
```

Example Telegram API call:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$NEXT_PUBLIC_BASE_URL/api/telegram/webhook/$TELEGRAM_WEBHOOK_SECRET\"}"
```

## Linking Telegram account

1. Login to web app.
2. Call `POST /api/telegram/link` (or use Settings page button) to generate code.
3. Send `/link CODE` to the Telegram bot.
4. Bot webhook stores mapping in `telegram_identities`.

## Bot interaction guide

### 1. Link web account to Telegram (required)

1. Open web app and login (`/login`).
2. Go to `/settings` and click "Tạo mã liên kết" (or call `POST /api/telegram/link`).
3. Copy the returned code (example: `AB12CD34`).
4. In Telegram chat with your bot, send:

```text
/link AB12CD34
```

5. After webhook receives the command, your Telegram account is mapped to your app user in `telegram_identities`.

### 2. Send expense messages to the bot

Supported examples (from spec/parser):

```text
coffee 45k
ăn sáng 35k
#food ăn trưa 65k
2026-02-23 cafe 45k
23/02 grab 45k
```

Supported amount units:

- `k` (thousand): `45k` -> `45000`
- `tr` or `m` (million): `1.2tr` -> `1200000`
- `đ`, `vnd`, `vnđ`

Tags and optional parts:

- Tag: `#food`, `#cafe`
- Date: `YYYY-MM-DD` or `DD/MM`
- Wallet hint (optional, parser support): `$cash`, `$momo`, `$bank`, `$card`

Example with tag + wallet:

```text
#food ăn trưa 65k $momo
```

### 3. What happens after sending a message

1. Telegram sends update to your webhook: `POST /api/telegram/webhook/<SECRET>`
2. App stores raw Telegram payload in `telegram_messages`
3. Parser extracts amount/date/tags/description
4. App creates or updates `expenses` (idempotent by Telegram message)
5. Expense gets status:

- `CONFIRMED`: parser confidence >= `0.8`
- `PENDING_REVIEW`: parsed but confidence thấp
- `UNPARSED`: không tìm thấy amount

### 4. Review queue on web

- Open `/expenses`
- Filter by `PENDING_REVIEW` or `UNPARSED`
- Edit expense via API (`PATCH /api/expenses/:id`) or extend UI to call patch endpoint

### 5. Test bot/webhook quickly (manual)

Check webhook status:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

Delete webhook (if switching environment):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
```

Re-set webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$NEXT_PUBLIC_BASE_URL/api/telegram/webhook/$TELEGRAM_WEBHOOK_SECRET\"}"
```

## API summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/expenses`
- `POST /api/expenses`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id` (soft delete)
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `POST /api/telegram/link`
- `POST /api/telegram/webhook/:secret`

## Parser tests

```bash
npm test
```

## Supabase RLS (optional)

Apply `supabase/rls-policies.sql` after schema migration if using Supabase auth + `auth.uid()` mapping.

## Notes

- UI pages currently render demo data to make the dashboard visible immediately; APIs are implemented for real DB-backed integration.
- `TELEGRAM_BOT_TOKEN` is server-only and never exposed to client code.
- If a bot token was accidentally pasted into editor/chat, rotate it in BotFather immediately.

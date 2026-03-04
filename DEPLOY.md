# Deploy Guide (Vercel + Prisma)

Tài liệu này dùng để deploy project lên Vercel và tránh lỗi lệch schema DB (ví dụ thiếu cột như `Expense.parseConfidence`).

## 1) Chuẩn bị

- Đảm bảo migration đã được commit đầy đủ trong `prisma/migrations`.
- Không dùng `prisma migrate dev` trên production.
- Dùng `prisma migrate deploy` cho production.

## 2) Biến môi trường trên Vercel

Thiết lập trong `Project Settings -> Environment Variables`:

- `DATABASE_URL` (bắt buộc)
- `DIRECT_URL` (nếu Prisma schema đang dùng)
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BOT_USERNAME`
- `NEXT_PUBLIC_BASE_URL` (URL public của app, ví dụ `https://your-app.vercel.app`)
- `DEBUG` (`true/false`, khuyến nghị `false` ở production)

Lưu ý:
- `NEXT_PUBLIC_*` sẽ lộ ra client-side, không để secret trong biến này.
- Nếu dùng Supabase/managed Postgres, kiểm tra IP/network policy cho Vercel.

## 3) Build command trên Vercel

Khuyến nghị:

```bash
npx prisma generate && npm run build
```

`Install Command` giữ mặc định (`npm install`) hoặc theo lockfile.

## 4) Quy trình deploy production an toàn

### Bước A: Deploy code

- Push code lên branch production (hoặc merge vào `main` tùy flow của bạn).
- Vercel sẽ build và tạo deployment.

### Bước B: Chạy migration production

Từ local/CI với đúng `DATABASE_URL` production:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

Nếu dùng local:
- Dùng file env production tạm thời hoặc export biến môi trường trước khi chạy lệnh.

## 5) Verify sau deploy

Chạy nhanh:

1. Mở `/dashboard`, `/expenses`, `/settings`.
2. Kiểm tra log Vercel không còn lỗi kiểu `P2022` (column does not exist).
3. Gọi thử API quan trọng:
   - `/api/dashboard/summary`
   - `/api/expenses`
   - Telegram webhook flow (nếu đang bật bot)

## 6) Xử lý khi DB lệch schema

Triệu chứng:
- `PrismaClientKnownRequestError` code `P2022`
- Lỗi `The column ... does not exist`

Cách xử lý:

```bash
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
```

Sau đó redeploy/restart.

## 7) Rollback nhanh

Nếu release mới lỗi:

1. Rollback Vercel về deployment trước.
2. Nếu migration mới gây lỗi dữ liệu, tạo migration fix-forward (khuyến nghị) thay vì sửa tay trực tiếp DB.

## 8) CI/CD khuyến nghị

Pipeline production nên có thứ tự:

1. Test + build
2. `prisma migrate deploy`
3. Deploy Vercel

Điểm quan trọng: luôn đảm bảo code và schema DB cùng version.

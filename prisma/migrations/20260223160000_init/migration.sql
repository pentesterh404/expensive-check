CREATE TYPE "ExpenseStatus" AS ENUM ('CONFIRMED', 'PENDING_REVIEW', 'UNPARSED', 'DELETED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TelegramIdentity" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "telegramUserId" BIGINT NOT NULL UNIQUE,
  "telegramChatId" BIGINT,
  "username" TEXT,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TelegramLinkCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TelegramMessage" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "chatId" BIGINT NOT NULL,
  "messageId" INTEGER NOT NULL,
  "telegramUserId" BIGINT,
  "rawUpdate" JSONB NOT NULL,
  "rawText" TEXT,
  "parsedPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramMessage_chatId_messageId_key" UNIQUE ("chatId", "messageId")
);

CREATE TABLE "Category" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "color" TEXT,
  "icon" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_userId_slug_key" UNIQUE ("userId", "slug")
);

CREATE TABLE "Expense" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "telegramMessageId" TEXT,
  "categoryId" TEXT,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "rawText" TEXT,
  "description" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "wallet" TEXT,
  "parseConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_telegramMessageId_key" UNIQUE ("telegramMessageId");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "TelegramIdentity" ADD CONSTRAINT "TelegramIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramLinkCode" ADD CONSTRAINT "TelegramLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramMessage" ADD CONSTRAINT "TelegramMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_telegramMessageId_fkey" FOREIGN KEY ("telegramMessageId") REFERENCES "TelegramMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TelegramIdentity_userId_idx" ON "TelegramIdentity"("userId");
CREATE INDEX "TelegramLinkCode_userId_expiresAt_idx" ON "TelegramLinkCode"("userId", "expiresAt");
CREATE INDEX "TelegramMessage_userId_idx" ON "TelegramMessage"("userId");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE INDEX "Expense_userId_expenseDate_idx" ON "Expense"("userId", "expenseDate");
CREATE INDEX "Expense_userId_status_idx" ON "Expense"("userId", "status");
CREATE INDEX "Expense_telegramMessageId_idx" ON "Expense"("telegramMessageId");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

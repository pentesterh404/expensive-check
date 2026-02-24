-- Optional RLS policies for Supabase Postgres
-- Assumes authenticated role and custom app user id is mapped to auth.uid()::text.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelegramIdentity" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_self_select ON "User";
CREATE POLICY user_self_select ON "User"
FOR SELECT USING (id = auth.uid()::text);

DROP POLICY IF EXISTS user_self_update ON "User";
CREATE POLICY user_self_update ON "User"
FOR UPDATE USING (id = auth.uid()::text);

DROP POLICY IF EXISTS expenses_user_rw ON "Expense";
CREATE POLICY expenses_user_rw ON "Expense"
FOR ALL USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS categories_user_rw ON "Category";
CREATE POLICY categories_user_rw ON "Category"
FOR ALL USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS telegram_identities_user_rw ON "TelegramIdentity";
CREATE POLICY telegram_identities_user_rw ON "TelegramIdentity"
FOR ALL USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

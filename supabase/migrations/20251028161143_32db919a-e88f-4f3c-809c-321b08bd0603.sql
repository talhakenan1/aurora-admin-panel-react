-- Fix telegram_messages RLS policy to prevent unauthorized access
DROP POLICY IF EXISTS "Users can view their own telegram messages" ON telegram_messages;
DROP POLICY IF EXISTS "Users can insert their own telegram messages" ON telegram_messages;

-- Only allow viewing messages where user is authenticated and matches user_id
CREATE POLICY "Users can view their own telegram messages"
ON telegram_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Allow inserting only with authenticated user_id
CREATE POLICY "Users can insert their own telegram messages"
ON telegram_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);
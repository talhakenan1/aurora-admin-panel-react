-- Fix telegram_users table by removing placeholder values and adding proper constraints
ALTER TABLE public.telegram_users 
ALTER COLUMN user_id DROP DEFAULT,
ALTER COLUMN customer_id DROP DEFAULT;

-- Create telegram_messages table to log all bot interactions
CREATE TABLE public.telegram_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id BIGINT NOT NULL,
  message_text TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  direction TEXT NOT NULL DEFAULT 'incoming', -- 'incoming' or 'outgoing'
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB
);

-- Enable RLS for telegram_messages
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for telegram_messages
CREATE POLICY "Users can view their own telegram messages" 
ON public.telegram_messages 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own telegram messages" 
ON public.telegram_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create index for better performance
CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages(telegram_chat_id);
CREATE INDEX idx_telegram_messages_created_at ON public.telegram_messages(created_at);

-- Add phone search function
CREATE OR REPLACE FUNCTION public.find_customer_by_phone(phone_number TEXT)
RETURNS TABLE(customer_id UUID, customer_name TEXT, user_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id as customer_id, c.name as customer_name, c.user_id
  FROM public.customers c
  WHERE c.phone = phone_number
  LIMIT 1;
END;
$$;
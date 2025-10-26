-- Add user_type column to telegram_users table
ALTER TABLE public.telegram_users 
ADD COLUMN user_type text NOT NULL DEFAULT 'customer' CHECK (user_type IN ('customer', 'business_owner'));

-- Make customer_id nullable for business owners
ALTER TABLE public.telegram_users 
ALTER COLUMN customer_id DROP NOT NULL;

-- Create verification_codes table for business owner registration
CREATE TABLE public.verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_codes
CREATE POLICY "Users can view their own verification codes"
ON public.verification_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes"
ON public.verification_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes"
ON public.verification_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_verification_codes_code ON public.verification_codes(code) WHERE used = false;
CREATE INDEX idx_verification_codes_user_id ON public.verification_codes(user_id);

-- Add notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  notification_time time without time zone DEFAULT '09:00:00',
  minimum_debt_amount numeric DEFAULT 0,
  daily_enabled boolean DEFAULT true,
  weekly_enabled boolean DEFAULT false,
  monthly_enabled boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for notification_preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
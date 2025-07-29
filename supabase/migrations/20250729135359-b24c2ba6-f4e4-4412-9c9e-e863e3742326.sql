-- Fix reminder_settings table structure to match frontend expectations
ALTER TABLE public.reminder_settings 
ADD COLUMN reminder_days_before integer[] DEFAULT '{1,3,7}';

-- Update existing records to use the new column format
UPDATE public.reminder_settings 
SET reminder_days_before = ARRAY[days_before_due]
WHERE reminder_days_before IS NULL;
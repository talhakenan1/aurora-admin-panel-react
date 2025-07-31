-- Fix security issues: Set search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_customer_by_phone(phone_number TEXT)
RETURNS TABLE(customer_id UUID, customer_name TEXT, user_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id as customer_id, c.name as customer_name, c.user_id
  FROM public.customers c
  WHERE c.phone = phone_number
  LIMIT 1;
END;
$$;
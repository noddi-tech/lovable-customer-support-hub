-- Add customer_id to calls table to link calls with customers
ALTER TABLE public.calls 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for better query performance
CREATE INDEX idx_calls_customer_id ON public.calls(customer_id);

-- Create function to link call to customer by phone number
CREATE OR REPLACE FUNCTION public.link_call_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  found_customer_id UUID;
BEGIN
  -- Only process if customer_id is null and we have a customer_phone
  IF NEW.customer_id IS NULL AND NEW.customer_phone IS NOT NULL THEN
    -- Try to find existing customer by phone
    SELECT id INTO found_customer_id
    FROM public.customers
    WHERE phone = NEW.customer_phone
      AND organization_id = NEW.organization_id
    LIMIT 1;
    
    -- If customer found, link it
    IF found_customer_id IS NOT NULL THEN
      NEW.customer_id := found_customer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically link calls to customers
CREATE TRIGGER link_call_customer_trigger
  BEFORE INSERT OR UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.link_call_to_customer();
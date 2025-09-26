-- Create the noddi_customer_cache table
CREATE TABLE IF NOT EXISTS public.noddi_customer_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  customer_id TEXT,
  noddi_user_id INTEGER,
  user_group_id INTEGER,
  email TEXT NOT NULL UNIQUE,
  last_refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  priority_booking_id INTEGER,
  priority_booking_type TEXT,
  pending_bookings_count INTEGER DEFAULT 0,
  cached_customer_data JSONB DEFAULT '{}',
  cached_priority_booking JSONB DEFAULT '{}',
  cached_pending_bookings JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.noddi_customer_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization-level access
CREATE POLICY "Users can view cache data in their organization" 
ON public.noddi_customer_cache 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert cache data in their organization" 
ON public.noddi_customer_cache 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update cache data in their organization" 
ON public.noddi_customer_cache 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete cache data in their organization" 
ON public.noddi_customer_cache 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Create indexes for better performance
CREATE INDEX idx_noddi_cache_email ON public.noddi_customer_cache(email);
CREATE INDEX idx_noddi_cache_organization ON public.noddi_customer_cache(organization_id);
CREATE INDEX idx_noddi_cache_customer_id ON public.noddi_customer_cache(customer_id);
CREATE INDEX idx_noddi_cache_last_refreshed ON public.noddi_customer_cache(last_refreshed_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_noddi_customer_cache_updated_at
BEFORE UPDATE ON public.noddi_customer_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
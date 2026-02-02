-- Insert mobile services categories for Noddi organization
INSERT INTO public.knowledge_categories (organization_id, name, color, description) VALUES
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Service Delivery', '#3B82F6', 'Questions about on-site service execution and delivery'),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Booking & Scheduling', '#10B981', 'Appointment booking, rescheduling, and availability inquiries'),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Pricing & Payments', '#8B5CF6', 'Service pricing, payment methods, and billing questions'),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Service Locations', '#F59E0B', 'Coverage areas, travel fees, and location-based queries'),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Technical Issues', '#14B8A6', 'App issues, platform problems, and technical troubleshooting'),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Account Management', '#EC4899', 'User accounts, profiles, and subscription management'),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'Service Providers', '#6B7280', 'Questions about service technicians and partner businesses')
ON CONFLICT (organization_id, name) DO NOTHING;
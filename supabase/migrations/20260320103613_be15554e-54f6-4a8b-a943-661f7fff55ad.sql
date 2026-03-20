-- Create the correct customer for Amanuel
INSERT INTO customers (email, full_name, organization_id)
VALUES ('amanueltekber@gmail.com', 'Amanuel Tekber', 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b');

-- Update the conversation to point to the new customer
UPDATE conversations 
SET customer_id = (SELECT id FROM customers WHERE email = 'amanueltekber@gmail.com' AND organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b')
WHERE id = 'b97bfe81-6660-4e3e-bafe-d1b8c98df928';
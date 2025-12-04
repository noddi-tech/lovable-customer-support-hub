-- Fix duplicate customer: update the one with conversations to have the correct name
UPDATE public.customers 
SET full_name = 'Pål Gerhardsen'
WHERE id = '3b42cd7f-d531-4667-931e-e71bcf411642';

-- Delete the orphaned duplicate
DELETE FROM public.customers 
WHERE id = '5419c0c1-7527-4e1f-87e3-c94f90535fa2';
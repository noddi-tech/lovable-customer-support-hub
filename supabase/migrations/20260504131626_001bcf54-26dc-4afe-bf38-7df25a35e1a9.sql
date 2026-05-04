DELETE FROM recruitment_bulk_import_lead_log WHERE bulk_import_id = 'f6d55e2a-47f2-4bab-8b1c-4b33e7a609ca';
DELETE FROM applicants WHERE imported_via_bulk_import_id = 'f6d55e2a-47f2-4bab-8b1c-4b33e7a609ca';
DELETE FROM recruitment_bulk_imports WHERE id = 'f6d55e2a-47f2-4bab-8b1c-4b33e7a609ca';
DELETE FROM recruitment_lead_ingestion_log WHERE created_at >= '2026-05-04 12:57:00+00' AND source = 'meta_lead_ad';
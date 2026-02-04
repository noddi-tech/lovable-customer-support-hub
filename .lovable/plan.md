

# Add New Service Tags to Knowledge Base

## Summary

Add missing service vertical tags and a new service-related tag for post-service quality checks.

## New Tags to Create

| Tag Name | Color | Category | Purpose |
|----------|-------|----------|---------|
| `rim-repair` | Red (#EF4444) | Global | Service vertical for rim/wheel repairs |
| `inside-wash` | Red (#EF4444) | Global | Service vertical for interior car wash |
| `outside-wash` | Red (#EF4444) | Global | Service vertical for exterior car wash |
| `torque-check` | Blue (#3B82F6) | Service Delivery | Bolt tightening / torque verification follow-ups |

## Rationale

- **Service vertical tags** (rim-repair, inside-wash, outside-wash): Kept as **global** with **red color** to match existing service tags (tire-sale, wheel-change, car-wash, etc.)
- **torque-check**: Linked to **Service Delivery** category since it relates to post-service quality, similar to `quality-issue`, `delayed`, and `completed` tags

## Existing Tags You Can Use

For the screenshot you shared (customer asking about bolt tightening after wheel change):
- **Category**: Service Delivery
- **Tags**: `quality-issue` + `wheel-change` (existing) + `torque-check` (new)

## Technical Implementation

Run a single SQL insert to add all new tags to the `knowledge_tags` table:

```sql
INSERT INTO knowledge_tags (organization_id, name, color, category_id)
VALUES 
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'rim-repair', '#EF4444', NULL),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'inside-wash', '#EF4444', NULL),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'outside-wash', '#EF4444', NULL),
  ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'torque-check', '#3B82F6', 
    '6fde31b3-5c29-4471-b590-78b0a3115b4d');
```

No code changes needed - just a database insert. The TagMultiSelect component will automatically show the new tags.


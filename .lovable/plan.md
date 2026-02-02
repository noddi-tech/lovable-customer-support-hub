

# Fix Categories Display + Category-Linked Tags

## Issue: Categories Not Showing

**Root Cause**: The 7 default categories were inserted successfully via migration (I verified 8 categories exist in the database). The issue is that React Query is caching the old data from before the migration ran.

**Solution**: A simple page refresh should show all categories. Alternatively, the query cache needs to be invalidated. The data exists:

| Category | Color |
|----------|-------|
| Service Delivery | Blue |
| Booking & Scheduling | Green |
| Pricing & Payments | Purple |
| Service Locations | Orange |
| Technical Issues | Teal |
| Account Management | Pink |
| Service Providers | Gray |
| Booking (manually created) | Green |

**Quick Fix**: Refresh the page or add a manual refresh button.

---

## UX Enhancement: Category-Linked Tags

You raise an excellent point about linking tags to categories. Here are the UX options:

### Option A: Category-Specific Tags (Recommended)

Add a `category_id` foreign key to the `knowledge_tags` table. When creating an entry:
1. User selects a category first
2. Tag dropdown filters to show only tags belonging to that category
3. Tags without a category appear in all categories (global tags)

**Pros:**
- Reduces cognitive load - fewer irrelevant options
- Forces consistent taxonomy
- Natural mental model: "Booking" category has booking-specific tags

**Cons:**
- Requires more upfront setup by admins
- May need some global tags that apply everywhere

### Option B: Suggested Tags (Middle Ground)

Tags remain independent but:
1. When selecting a category, show "Suggested tags" based on historical usage patterns
2. All other tags still available in an "Other tags" section
3. AI could learn which tags are commonly used with each category

**Pros:**
- More flexible
- Self-learning over time
- Less admin setup required

**Cons:**
- Not as strict - still allows inconsistent tagging

### Option C: Tag Groups (Alternative)

Create separate "Tag Groups" that aren't tied to categories. Admins create groups like "Service Type", "Issue Type", "Customer Type". Each group appears as a separate dropdown.

**Pros:**
- Maximum flexibility
- Entries can have structured multi-dimensional tagging

**Cons:**
- More complex UI
- Potentially overwhelming

---

## Recommended Implementation: Option A

Link tags to categories with a fallback for global tags.

### Database Changes

Add `category_id` column to `knowledge_tags`:

```text
knowledge_tags
+-----------------+
| id              |
| organization_id |
| name            |
| color           |
| category_id     | <-- NEW: nullable FK to knowledge_categories
| created_at      |
| updated_at      |
+-----------------+
```

When `category_id` is NULL, the tag is "global" and appears for all categories.

### UI Changes

**1. Tag Manager (Settings)**
- Add category dropdown when creating/editing tags
- Show "Global" option for tags that apply to all categories
- Group tags by category in the list view

**2. Entry Creation Form**
- Category selection becomes required/first step
- Tag multi-select filters based on selected category + global tags
- If no category selected yet, show message: "Select a category first to see available tags"

**3. Default Tags**

Insert starter tags for each category:

| Category | Example Tags |
|----------|--------------|
| Booking & Scheduling | reschedule, cancellation, availability, time-slot |
| Pricing & Payments | refund, invoice, discount, payment-failed |
| Service Delivery | delayed, completed, quality-issue, no-show |
| Service Locations | coverage, travel-fee, new-area |
| Technical Issues | app-crash, login-problem, notification |
| Account Management | password-reset, profile-update, subscription |
| Service Providers | rating, certification, response-time |
| Global (no category) | urgent, follow-up, escalation, how-to |

---

## Implementation Summary

| Step | Description |
|------|-------------|
| 1 | Add refresh mechanism or force React Query cache invalidation to show existing categories |
| 2 | Add `category_id` column to `knowledge_tags` table |
| 3 | Update `TagManager` to show category dropdown when creating tags |
| 4 | Update `TagMultiSelect` to filter tags by selected category |
| 5 | Update entry creation form to require category before showing tags |
| 6 | Insert default tags for each category |


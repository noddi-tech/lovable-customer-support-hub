
# Feature: Knowledge Base Categories and Tags Management

## Overview

Add dedicated management for categories and tags in the Knowledge Management System, allowing admins to create, edit, and delete predefined categories and tags. This prevents typos and ensures consistent taxonomy across knowledge entries.

## Current State

- **Categories**: Hardcoded to 3 values (technical_support, billing, general_inquiry) in the component
- **Tags**: Free-text input where users type comma-separated values - prone to typos and inconsistencies
- **No database tables** exist for managing categories or tags

## Solution Architecture

### 1. Database Schema

Create two new tables to store organization-specific categories and tags:

```text
+------------------------+       +--------------------+
| knowledge_categories   |       | knowledge_tags     |
+------------------------+       +--------------------+
| id (uuid, PK)          |       | id (uuid, PK)      |
| organization_id (uuid) |       | organization_id    |
| name (text)            |       | name (text)        |
| color (text)           |       | color (text, opt)  |
| description (text)     |       | created_at         |
| is_active (boolean)    |       | updated_at         |
| created_at             |       +--------------------+
| updated_at             |
+------------------------+
```

**RLS Policies:**
- Users can view categories/tags in their organization
- Admins with `manage_settings` permission can create/update/delete

### 2. New Tab: Settings

Add a new "Settings" tab to the Knowledge Management page alongside Overview, Entries, Performance, and System Health.

```text
+----------+----------+-------------+---------------+----------+
| Overview | Entries  | Performance | System Health | Settings |
+----------+----------+-------------+---------------+----------+
```

### 3. Settings Tab Content

The Settings tab will contain two sections:

**Categories Management**
- List of existing categories with name, color badge, description
- "Add Category" button opens a dialog with name, color picker, description fields
- Edit and delete buttons for each category
- Default categories seeded on first load if none exist

**Tags Management**
- List of existing tags with name and optional color
- "Add Tag" button opens a simple dialog
- Edit and delete buttons for each tag
- Tags displayed as chips/badges

### 4. Update Entry Forms

Modify the Create/Edit entry dialogs in `KnowledgeEntriesManager.tsx`:

**Category Field:**
- Change from hardcoded Select options to dynamic list from `knowledge_categories` table
- Show color badge next to each category name

**Tags Field:**
- Replace free-text input with a multi-select component
- Fetch available tags from `knowledge_tags` table
- Allow selecting multiple predefined tags
- Display selected tags as removable chips

### 5. Update Filter Dropdown

The category filter in Search & Filter should also use dynamic categories from the database.

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/knowledge/KnowledgeSettings.tsx` | Main settings component with categories and tags management |
| `src/components/dashboard/knowledge/CategoryManager.tsx` | Category CRUD operations UI |
| `src/components/dashboard/knowledge/TagManager.tsx` | Tag CRUD operations UI |
| `src/components/dashboard/knowledge/TagMultiSelect.tsx` | Multi-select component for choosing tags |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/KnowledgeManagement.tsx` | Add Settings tab |
| `src/components/dashboard/knowledge/KnowledgeEntriesManager.tsx` | Replace hardcoded categories with dynamic list, replace tag input with multi-select |
| Database migrations | Create `knowledge_categories` and `knowledge_tags` tables with RLS |

### UI Components

**Category Manager:**
```text
+--------------------------------------------------+
| Categories                          [+ Add]      |
+--------------------------------------------------+
| [●] Technical Support              [Edit] [Del]  |
|     Issues related to product functionality      |
+--------------------------------------------------+
| [●] Billing                        [Edit] [Del]  |
|     Payment and subscription questions           |
+--------------------------------------------------+
| [●] General Inquiry                [Edit] [Del]  |
|     General customer questions                   |
+--------------------------------------------------+
```

**Tag Manager:**
```text
+--------------------------------------------------+
| Tags                                [+ Add]      |
+--------------------------------------------------+
| [booking] [refund] [shipping] [account]          |
| [password] [pricing] [upgrade] [cancellation]    |
+--------------------------------------------------+
```

**Tag Multi-Select in Entry Form:**
```text
Tags
+--------------------------------------------------+
| [x booking] [x shipping]                         |
| ----------------------------------------         |
| [ ] refund                                       |
| [ ] account                                      |
| [ ] password                                     |
+--------------------------------------------------+
```

### Default Categories

Seed the following categories if organization has none:
- Technical Support (blue)
- Billing (green)  
- General Inquiry (purple)
- Shipping (orange)
- Account (teal)

## Technical Considerations

1. **Backward Compatibility**: Existing entries with string categories will continue to work. The UI will show the raw value if no matching category is found.

2. **Validation**: Prevent deletion of categories/tags that are currently in use by entries (show warning with count).

3. **Color Selection**: Use a predefined palette of 8-10 colors for simplicity rather than a full color picker.

4. **Performance**: Categories and tags are cached via React Query with appropriate stale times since they rarely change.

## Summary

This feature adds professional taxonomy management to the Knowledge Base:
- Administrators can define organization-specific categories and tags
- Entry creation uses controlled selection instead of free text
- Consistent categorization improves search, filtering, and AI suggestions
- Prevents typos and duplicate tags with slightly different spelling

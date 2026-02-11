

# Enhanced Component Library: Detail Views, API Info, and Component Creator

## Overview

Upgrade the Component Library's **Manage** tab from a static read-only table into a rich administration interface where admins can:

1. **Inspect** any component in detail -- see its API endpoints, edge functions, request/response format, and how it connects to the flow
2. **Create new components** by selecting a Noddi API endpoint, defining the request body, and configuring how the result is displayed in the widget

## Current Gaps

- The Manage table shows columns but rows are not clickable/expandable -- no way to see API details like "Phone Verify uses `widget-send-verification` and `widget-verify-phone` edge functions calling `GET /v1/users/send-phone-number-verification/`"
- No "Create New" functionality at all
- The registry `BlockDefinition` has no `apiConfig` metadata to describe connected endpoints

## Solution

### A. Extend BlockDefinition with API Metadata

Add an optional `apiConfig` field to the registry interface that documents which endpoints a component uses:

```text
BlockDefinition.apiConfig?: {
  endpoints: Array<{
    name: string;              // "Send Verification Code"
    edgeFunction: string;      // "widget-send-verification"
    externalApi?: string;      // "GET /v1/users/send-phone-number-verification/"
    method: string;            // "POST" (to edge function)
    requestBody?: Record<string, string>;   // { widgetKey, phoneNumber }
    responseShape?: Record<string, string>; // { success: boolean }
    description: string;
  }>;
}
```

Each existing block that uses APIs (currently only `PhoneVerifyBlock`) will register its endpoint metadata. Non-API blocks will simply omit this field.

### B. Expandable Detail Rows in Manage Tab

Replace the flat table with expandable rows. Clicking a row reveals a detail panel showing:

- **Description** (full text from flowMeta)
- **Marker Syntax** with copy button
- **API Endpoints** section (if `requiresApi`): lists each endpoint with its edge function name, external API URL, HTTP method, request body shape, and response shape
- **Applicable Field/Node Types** with explanation
- **Preview** (the static `previewComponent` rendered inline)

### C. "Create Component" Dialog

A multi-step dialog accessible via a "New Component" button at the top of the Manage tab:

**Step 1 -- Basic Info:**
- Component name (label)
- Type key (auto-generated from name, e.g., "date_picker")
- Icon (emoji picker or text input)
- Description
- Marker syntax (auto-generated: `[DATE_PICKER]`)
- Field type mapping (dropdown: text, email, phone, date, number, custom)
- Requires API? (toggle)

**Step 2 -- API Configuration (if API toggle is on):**
- Endpoint URL input (e.g., paste from https://api.noddi.co/docs/)
- HTTP Method selector (GET, POST, PUT, DELETE)
- Request body builder: key-value pairs with type hints (string, number, boolean)
- Response mapping: which field from the response to display
- Test button: makes a dry-run call to validate the endpoint configuration

**Step 3 -- Preview and Save:**
- Shows a summary card of the new component
- Saves the configuration to a new `widget_block_configs` Supabase table
- The saved config can be loaded at runtime to create dynamic blocks

This approach stores custom block configurations in the database, while the built-in blocks remain code-defined in the registry. A hybrid loader merges both sources.

## Technical Details

### New/Modified Files

| File | Change |
|------|--------|
| `src/widget/components/blocks/registry.ts` | Add optional `apiConfig` to `BlockDefinition` interface |
| `src/widget/components/blocks/PhoneVerifyBlock.tsx` | Add `apiConfig` with endpoint details to its `registerBlock()` call |
| `src/components/admin/widget/ComponentLibrary.tsx` | Replace ManageView table with expandable detail rows; add "New Component" button and multi-step creation dialog |

### Database Table (optional, for custom blocks)

```sql
CREATE TABLE widget_block_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  type_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '🔧',
  description TEXT,
  marker TEXT NOT NULL,
  closing_marker TEXT,
  field_type TEXT,
  requires_api BOOLEAN DEFAULT false,
  api_endpoints JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

This table allows admins to define custom blocks from the UI. At app load, these are merged into the registry alongside the code-defined blocks.

### Expandable Row Detail Layout

```text
+------------------------------------------------------------------+
| [icon] Phone + PIN Verification    API  phone        [Collapse ^] |
+------------------------------------------------------------------+
| Description:                                                      |
|   Customer sees a phone input, receives SMS with 6-digit PIN...   |
|                                                                   |
| Marker: [PHONE_VERIFY]  [Copy]                                   |
|                                                                   |
| API Endpoints:                                                    |
| +--------------------------------------------------------------+ |
| | 1. Send Verification Code                                    | |
| |    Edge Function: widget-send-verification                   | |
| |    External API: GET /v1/users/send-phone-number-verification| |
| |    Request: { widgetKey, phoneNumber, domain }               | |
| |    Response: { success: true }                               | |
| +--------------------------------------------------------------+ |
| | 2. Verify PIN                                                | |
| |    Edge Function: widget-verify-phone                        | |
| |    External API: POST /v1/users/verify-phone-number/         | |
| |    Request: { widgetKey, phoneNumber, pin, conversationId }  | |
| |    Response: { verified: boolean, token?: string }           | |
| +--------------------------------------------------------------+ |
|                                                                   |
| Preview:                                                          |
| +-----------------------------+                                   |
| | [mini phone input mockup]   |                                   |
| +-----------------------------+                                   |
+------------------------------------------------------------------+
```

### Create Component Dialog Flow

```text
Step 1: Basic Info          Step 2: API Config         Step 3: Review
+-------------------+      +-------------------+      +-------------------+
| Name: [________]  |      | Endpoint URL:     |      | Summary card      |
| Icon: [emoji]     |  ->  | [_____________]   |  ->  | with all config   |
| Description:      |      | Method: [POST v]  |      |                   |
| [______________]  |      | Request body:     |      | [Save Component]  |
| Field type: [v]   |      | key: [___] val:[v]|      |                   |
| Needs API? [x]    |      | + Add field       |      |                   |
|                   |      | [Test Endpoint]   |      |                   |
+-------------------+      +-------------------+      +-------------------+
```

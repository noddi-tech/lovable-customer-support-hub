## Plan: Diagnose Meta token access

I'm in read-only mode, so I can't run curl. Approve to switch to default mode and execute the two diagnostic calls using the page_access_token from `recruitment_meta_integrations` row `22455007-ce79-4872-b0d2-998212d4dcb2`.

### Step 1 — Fetch lead by ID
```bash
curl "https://graph.facebook.com/v19.0/26357467687289288?access_token=$TOKEN"
```
Returns the lead's field_data, created_time, ad_id, form_id — or an OAuthException explaining why access is denied.

### Step 2 — Inspect granted permissions on the token
```bash
curl "https://graph.facebook.com/v19.0/me/permissions?access_token=$TOKEN"
```
Returns the list of permissions and their `status` (`granted` / `declined`). We're looking for `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`.

### Deliverable
I'll paste both raw JSON responses verbatim so you can see exactly what Meta returns, including any error codes/subcodes.

No code or DB changes — purely diagnostic.

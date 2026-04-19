

I'll explore the codebase first to confirm patterns, then present a plan.
<lov-tool-use id="toolu_vrtx_01UPMhPx7G62okbi9RWT9HLX" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/recruitment/applicants/useApplicants.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JLGCiS9HgXSSyLTca2NL6U" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useAuth.tsx\", \"lines\": \"1-60\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JVtEmiSWCpXhi3te1Yb88A" name="code--search_files" integration-id="code" data="{\"query\": \"storage.from\\\\(\", \"include_patterns\": \"*.ts,*.tsx\", \"exclude_dirs\": \"node_modules\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SF8J7txQYy7WYrH2uhBvDT" name="code--search_files" integration-id="code" data="{\"query\": \"from\\\\('profiles'\\\\)\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01586sadrQdDKxozrofnJXSq" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/recruitment/applicants/useApplicants.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PasxvwUoo6Vn43hfcyJ5rz" name="code--search_files" integration-id="code" data="{\"query\": \"from\\\\('profiles'\\\\).select\", \"include_patterns\": \"*.ts,*.tsx\", \"exclude_dirs\": \"node_modules\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MP4F1MTM2K9gqjMsoD7SB5" name="code--search_files" integration-id="code" data="{\"query\": \"storage\\\\.from\\\\(\", \"include_patterns\": \"*.ts,*.tsx\", \"exclude_dirs\": \"node_modules\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Ebn6ptuujmCbTvHbn8FD92" name="security--get_table_schema" integration-id="security" data="">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01YWvFKMraHPsqnzAxgbFAzw" name="code--exec" integration-id="code" data="{\"command\": \"grep -n \\\"application_events\\\\|applicant_files\\\\|storage.buckets\\\\|applicant-files\\\" tool-results://security--get_table_schema/20260419-153129-402387 2>/dev/null | head -50\", \"user_facing_description\": \"Looking up schema details\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MdyVLyD7HT5pPZHhjRkQmJ" name="code--search_files" integration-id="code" data="{\"query\": \"application_events\", \"include_patterns\": \"*.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019DNGhkFPvZnGaDxWWm4o51" name="code--view" integration-id="code" data="{\"file_path\": \"tool-results://security--get_table_schema/20260419-153129-402387\", \"lines\": \"103-260\"}">
</lov-tool-use>
I have enough info. Let me check if `applicant-files` storage bucket exists and the team members hook.
<lov-tool-use id="toolu_vrtx_014BjEZzhXrqncqTFdSLXpVc" name="code--exec" integration-id="code" data="{\"command\": \"grep -n \\\"Storage Buckets\\\\|applicant-files\\\\|avatars\\\" tool-results://security--get_table_schema/20260419-153129-402387 | head -20\", \"user_facing_description\": \"Looking up storage buckets\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013nd7rf9yNAZTpPaKsR8Dc9" name="code--search_files" integration-id="code" data="{\"query\": \"Storage Buckets|applicant-files\", \"search_dir\": \"tool-results://security--get_table_schema\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WGyiZLH8b35riz3xQCVQb8" name="code--view" integration-id="code" data="{\"file_path\": \"tool-results://security--get_table_schema/20260419-153129-402387\", \"lines\": \"3700-3811\"}">
</lov-tool-use>
I have what I need. The `applicant-files` storage bucket exists. `profiles.full_name` is the right column. `useTeamMembers` already exists. The schema is confirmed. Now I'll present the plan.

<lov-plan>
# Plan: Full applicant profile page

Replace `ApplicantProfile.tsx` placeholder at `/operations/recruitment/applicants/:id` with the recruitment module's most important page.

## File structure

**New (`src/components/dashboard/recruitment/applicants/`):**
- `useApplicantProfile.ts` — all the data hooks listed below
- `ApplicantEventTimeline.tsx` — timeline feed with icon + description rendering
- `LogEventForm.tsx` — popover form for manual events (call, interview, other)
- `ApplicantInfoCard.tsx` — right-column qualifications card
- `ApplicantNotesTab.tsx`
- `ApplicantFilesTab.tsx`
- `MoveStageDialog.tsx` — confirmation + notification choice
- `ScoreCircle.tsx` — small reusable score badge

**Modified:**
- `ApplicantProfile.tsx` — full rewrite assembling everything

## Hooks (`useApplicantProfile.ts`)

All hooks scoped via RLS; query keys include applicant id so invalidation is precise.

- `useApplicantProfile(id)` — exactly the spec query, `.maybeSingle()`. Key `['applicant', id]`.
- `useApplicantEvents(applicantId)` — joins `profiles:performed_by(id, full_name, avatar_url)`. Key `['applicant-events', applicantId]`.
- `useApplicantNotes(applicantId)` — joins `profiles:author_id(id, full_name, avatar_url)`. Key `['applicant-notes', applicantId]`.
- `useApplicantFiles(applicantId)` — plain select, ordered desc. Key `['applicant-files', applicantId]`.
- `useUpdateApplicationStage()` — input `{ applicationId, applicantId, fromStageId, toStageId, notify }`. Updates `applications.current_stage_id`, then inserts `application_events` row `{ event_type: 'stage_change', event_data: { from: fromStageId, to: toStageId, notify } }`. Invalidates applicant + events + applicants list.
- `useAddApplicantNote()` — input `{ applicantId, applicationId?, content, note_type }`. Inserts note + `note_added` event with `{ note_type, preview }`. Invalidates notes + events.
- `useLogApplicantEvent()` — input `{ applicantId, applicationId, event_type, event_data, notes? }`. Generic insert. Invalidates events.
- `useAssignApplication()` — input `{ applicationId, applicantId, profileId, profileName }`. Updates `applications.assigned_to`, inserts `assigned` event with `{ profile_id, name }`. Invalidates events + applicant.
- `useUploadApplicantFile()` — uploads to `applicant-files/{org_id}/{applicant_id}/{timestamp}-{filename}`, then inserts `applicant_files` row + `file_uploaded` event with `{ file_name, file_type }`. Uses `currentOrganizationId` from store and `profile.id` from `useAuth()`.

`profile.id` from `useAuth()` is used for `performed_by` / `author_id` / `uploaded_by` (already the established pattern in `useApplicants.ts`). Reuses `useTeamMembers()` (already exists, queries `profiles` with `full_name`/`avatar_url`/org filter).

Reuses existing `useApplicantPipeline()` from `useApplicants.ts` for stage name/color lookups.

## `ApplicantProfile.tsx` (top section)

Layout: `<div className="p-6 max-w-7xl mx-auto space-y-6">`

- Back link "← Tilbake til søkere"
- `<h1 className="text-2xl font-semibold">{first_name} {last_name}</h1>`
- Contact row: `<Mail/>` mailto, `<Phone/>` tel, `<MapPin/>` location — muted, gap-4, flex-wrap, only render if value present
- Badge row: `<ApplicantSourceBadge>`, `<ApplicantStageBadge>` (first application's stage), `<ScoreCircle score={firstApp.score} />`
- Action row (gap-2):
  - `<Button variant="outline">Send e-post</Button>` — sets `tab='email'`
  - `<Button variant="outline" asChild><a href={`tel:${phone}`}>Ring</a></Button>` — disabled if no phone
  - "Flytt til..." → `<DropdownMenu>` listing pipeline stages → opens `<MoveStageDialog>`
  - "Tilordne" → `<DropdownMenu>` of `useTeamMembers()` results → calls `useAssignApplication()` directly

Loading: skeleton header. If `data === null`: "Søker ikke funnet" + back link.

## `MoveStageDialog.tsx`

`<Dialog>` with text "Flytt {name} til {stageName}? Vil du varsle søkeren?" and 4 buttons: E-post, SMS, Begge, Hopp over. All four call `useUpdateApplicationStage()` with the chosen `notify` value. Email/SMS dispatch is a TODO (`console.log('TODO: send', notify, applicantId)`). Toast: "Søker flyttet til {stageName}".

## Tabs (shadcn `Tabs`, value-controlled so "Send e-post" can switch it)

### Tab "Oversikt"
2-col grid `grid-cols-1 lg:grid-cols-3 gap-6`:

**Left (col-span-2):** "Hendelser" `<Card>`
- Header row: title + `<Popover>` triggered by `<Button size="sm"><Plus/>Logg hendelse</Button>` containing `<LogEventForm>`
- `<ApplicantEventTimeline events={events} pipeline={pipeline} />`

**Right (col-span-1):** `<ApplicantInfoCard applicant={data} />`
- Førerkort (badges from `drivers_license_classes`) / Erfaring (`years_experience`) / Sertifiseringer (badges from `certifications`) / Egen bil (`own_vehicle`) / Tilgjengelig fra (`availability_date` formatted) / Norsk (label from `language_norwegian`) / Arbeidstillatelse (label from `work_permit_status`) / GDPR samtykke (`gdpr_consent` + `gdpr_consent_at` date)
- Each row: `<dt className="text-sm text-muted-foreground">…</dt><dd>…</dd>`; "Ikke oppgitt" muted when null/empty

### `LogEventForm.tsx`
Local `useState`. Event type select drives conditional fields:
- `phone_call` → duration (number, min) + outcome `<Select>` (Interessert / Ikke svar / Ikke interessert / Ring tilbake) → `event_data: { duration_minutes, outcome }`
- `interview_scheduled` → type select (phone/onsite/trial_day) + datetime-local + location → `event_data: { interview_type, scheduled_at, location }`
- `interview_completed` → type + rating (1-5 number) + notes textarea → `event_data: { interview_type, rating }`, `notes`
- Annet → notes textarea → emits `note_added` with `{ note_type: 'internal', preview }`
Submit calls `useLogApplicantEvent()` (or `useAddApplicantNote()` for "Annet"), closes popover, resets form.

### `ApplicantEventTimeline.tsx`
For each event, vertical list. Layout per row: colored circle icon (left) + content block (right) + timeline connector line via border-l on container.

Icon + color map (Tailwind bg-X-100 text-X-600):
```
created → UserPlus / blue
stage_change → ArrowRight / purple
note_added → MessageSquare / gray
email_sent → Mail / green
email_received → MailOpen / blue
phone_call → Phone / orange
interview_scheduled → Calendar / indigo
interview_completed → CheckCircle / green
file_uploaded → Paperclip / gray
assigned → UserCheck / teal
sms_sent → Smartphone / yellow
score_calculated → BarChart / purple
```

`describeEvent(event, pipeline)` helper returns the human-readable string per spec (stage_change looks up `pipeline.stages.find(s => s.id === ...).name` for from/to). Renders performed-by ("System" if null) and `formatDistanceToNow(created_at, { addSuffix: true, locale: nb })`. If `event.notes` present, render below in muted small block.

### Tab "Notater" (`ApplicantNotesTab.tsx`)
- Top form: `<Textarea>` + `<Select>` (Internt notat / Intervjufeedback / Privat → `internal`/`interview_feedback`/`private`) + "Legg til" button → `useAddApplicantNote()`
- List below: each note → author name (from joined profile), timestamp (`formatDistanceToNow`), type badge (interview_feedback gets `bg-blue-100 text-blue-800`), content `whitespace-pre-wrap`

### Tab "Filer" (`ApplicantFilesTab.tsx`)
- File type `<Select>` (cv / cover_letter / drivers_license / certificate / id_document / other → Norwegian labels)
- Drop zone: dashed border, `<input type="file" hidden ref>` triggered by click; supports drag-and-drop via `onDragOver`/`onDrop`. Shows "Dra filer hit eller klikk for å laste opp"
- On file selected → `useUploadApplicantFile()` with chosen type
- File list table/cards: file_name, type badge, size (`formatBytes` helper → KB/MB), uploader name (lookup via `useTeamMembers` map by id), formatted date, download button (`supabase.storage.from('applicant-files').createSignedUrl(storage_path, 3600)` → window.open)

### Tab "E-post"
Plain `<Card>` with muted text "E-postkommunikasjon kobles til i fase 6"

## Helpers (inline in component files)
- `STAGE_LABELS` map for default stages used in fallback
- `LANG_LABELS` and `WORK_PERMIT_LABELS` Norwegian maps
- `formatBytes(n)` helper

## Notes
- All UI strings in Norwegian Bokmål.
- RLS handles org scoping for all 4 tables + storage bucket (verified in schema dump).
- Storage path follows existing policy: `{org_id}/{applicant_id}/{filename}` (first folder = org id per RLS check).
- `profiles.full_name` is the correct column (verified in `useTeamMembers` and `ConversationViewContext`).
- No DB migrations required — `applicant_files`, `applicant_notes`, `application_events` tables and `applicant-files` bucket all exist with proper RLS.
- No new shadcn deps; reuses Dialog, Popover, DropdownMenu, Tabs, Card, Badge, Select, Textarea, Button, Skeleton.

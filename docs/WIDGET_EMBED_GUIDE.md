# Support Widget — Implementation Guide

How to embed the Noddi Support Hub widget (live chat, contact form, AI assistant) on a website, and how to tag conversations with a **brand** so support agents can see which site/brand a chat came from.

---

## 1. Install the script

```html
<script>
  window.NoddiWidget = window.NoddiWidget || function () {
    (window.NoddiWidget.q = window.NoddiWidget.q || []).push(arguments);
  };
</script>
<script async src="https://support.noddi.co/widget.js"></script>
<script>
  NoddiWidget('init', {
    widgetKey: 'YOUR_WIDGET_KEY',
    brand: 'Noddi Bilpleie'
  });
</script>
```

The `q` queue means you can call `NoddiWidget(...)` before the script finishes loading; commands are replayed on init.

---

## 2. `init` options

| Option | Type | Default | Description |
|---|---|---|---|
| `widgetKey` | `string` | — | **Required.** Public widget key from Admin → Widget settings. |
| `brand` | `string` | — | Brand of the host site. Shown to agents on every chat/contact-form conversation. Max 40 chars. |
| `apiUrl` | `string` | Support Hub URL | Override the backend base URL (self-hosting / staging). |
| `position` | `'bottom-right' \| 'bottom-left'` | admin config | Overrides the position configured in admin. |
| `showButton` | `boolean` | `true` | Set `false` to hide the floating launcher and open the widget yourself. |
| `onReady` | `() => void` | — | Called when the widget is mounted and programmatic commands are available. |
| `locale` | `string` | — | Visitor language (BCP-47, e.g. `nb-NO`, `en-US`, `sv-SE`, or the frontend codes `nb` / `en` / `se`). Maps to the widget UI languages `no` / `en` / `sv`; anything else falls back to `no`. Sent on `init` or `update` it always wins over the visitor's previously stored language choice. Max 20 chars. |
| `environment` | `string` | — | `production` / `staging` / `development`. Non-production is badged in the hub so agents can ignore test noise. Max 20 chars. |
| `sourceApp` | `string` | — | Product surface using this widget key, e.g. `customer`, `partner`, `marketing`. Max 40 chars. |
| `userId` | `string \| number` | — | User id of the logged-in visitor — lets agents skip manual customer matching. |
| `serviceDepartmentId` | `string \| number` | — | Service department to route/filter by. |
| `bookingId` | `string \| number` | — | Booking the visitor is currently in. |
| `orderId` | `string \| number` | — | Order the visitor is currently in. |
| `bookingSlug` | `string` | — | Booking slug for draft flows that have no numeric id yet. Max 80 chars. |
| `context` | `WidgetHostContext` | — | **Preferred.** Nested object holding all of the fields above; merged over the flat ones. |
| `identity` | `WidgetIdentity` | — | Known visitor at boot; same as calling `identify` right after `init`. |
| `pathname` | `string` | live location | SPA route. Defaults to `location.pathname + search` at conversation creation, since `page_url` is often just the entry URL. Max 300 chars. |
| `appVersion` | `string` | — | Host app release, to correlate reports with deploys. Max 40 chars. |

---

## 3. The `brand` field

### Why
Several frontends share one support inbox. Without a brand, agents only see the page URL. With it, the inbox list and the conversation header show a brand badge — including the official brand logo, when the value matches a brand in the Noddi backend brand catalog.

### What to send
Send the brand **name** or **slug** exactly as it exists in the Noddi brand catalog (`GET /v1/brands/`), e.g.:

```js
NoddiWidget('init', {
  widgetKey: 'YOUR_WIDGET_KEY',
  brand: 'Noddi Bilpleie'   // or the slug: 'noddi-bilpleie'
});
```

Rules:
- Plain string, trimmed, truncated to 40 characters.
- Case-insensitive matching against the brand catalog.
- If it does not match a known brand, the value is still shown to agents as a plain coloured badge — nothing breaks.
- If `brand` is omitted, the hub derives an inferred label from the page hostname (e.g. `noddi.co`). That fallback has no logo and is marked as inferred.

### Multi-brand sites
If one page can serve multiple brands, set the brand at init time from your own runtime context:

```js
NoddiWidget('init', {
  widgetKey: 'YOUR_WIDGET_KEY',
  brand: window.__APP_CONFIG__.brand.name
});
```

The brand is captured on **conversation creation** (chat start and contact-form submit), so it must be set before the visitor opens a conversation — i.e. at `init`. Changing brand later requires re-initialising the widget.

### Where it ends up
Stored on `conversations.metadata.brand` and rendered by the Support Hub in:
- the email/conversation inbox list rows,
- the live chat list,
- the conversation header.

---

## 4. Extra context fields

All fields below are optional and additive — send what you have:

```js
NoddiWidget('init', {
  widgetKey: 'YOUR_WIDGET_KEY',
  brand: 'noddi',
  locale: 'nb-NO',
  environment: import.meta.env.MODE === 'production' ? 'production' : 'staging',
  sourceApp: 'customer',
  userId: user?.id,
  serviceDepartmentId: user?.serviceDepartmentId,
  bookingId: currentBooking?.id,
  orderId: currentOrder?.id,
  licensePlate: selectedCar?.licensePlate,
  car: selectedCar?.displayName,
  appVersion: __APP_VERSION__,
});
```

Rules:
- Values are coerced to strings, stripped of markup/control characters and truncated to the limits above; unknown keys are dropped server-side.
- Like `brand`, they are captured on **conversation creation** (chat start and contact-form submit), so set them at `init`. Re-initialise the widget to change them.
- Never send secrets, tokens or full personal data — this is displayed verbatim to agents.

### Where it ends up
Stored on `conversations.metadata.context` (and on the chat session metadata) and shown to agents as a **Session context** card in the conversation side panel, with a badge when `environment` is not production.

---

### Typed contract

A versioned type definition ships with the hub: [`docs/widget-host.d.ts`](./widget-host.d.ts),
also served at `https://support.noddi.co/docs/widget-host.d.ts`. Copy it into your app and type
your wrapper with `WidgetHostCommands` instead of `Record<string, unknown>`.

### Prefer the nested `context` object

The flat keys stay supported, but the stable shape is one nested object:

```js
NoddiWidget('update', {
  context: { pathname: location.pathname, bookingSlug: draft.slug },
});
```

Unknown keys are dropped server-side; the allow-list is the `WidgetHostContext` type.

---

## 5. Identifying logged-in users

If your app knows who the visitor is, call `identify` after `init` (and after login).
The visitor then skips the pre-chat name/email form, and agents see the identity on
the conversation.

```js
NoddiWidget('identify', {
  userId: user.id,
  name: user.fullName,
  email: user.email,
  phone: user.phoneNumber,
});
```

On logout, clear the visitor **without** tearing the widget down:

```js
NoddiWidget('clearIdentity');       // or: NoddiWidget('identify', null)
```

Both clear the stored identity *and* the stored chat session (`noddi_chat_session`)
while the widget stays booted, so logout is just `clearIdentity` + `update` — no
re-`init` dance. `NoddiWidget('shutdown')` is now an alias for the same behaviour.

Rules:
- The widget key is public, so identity is an **unverified hint**. It is shown to
  agents as "Identified by the host app (unverified)" and never grants access to
  customer data on its own.
- `email` must be a valid address or it is dropped; all values are sanitized and
  truncated like context fields.
- Sending `identify` before `init` is fine — the call is queued.

### Updating context mid-session

When the user navigates to another booking, car or route, push the change without
re-initialising:

```js
NoddiWidget('update', {
  brand: 'Noddi Bilpleie',              // mid-session brand switch (multi-brand SPAs)
  context: {
    locale: 'nb-NO',
    environment: 'staging',
    bookingId: newBooking.id,
    pathname: location.pathname,
  },
});
```

`update` accepts **every** field `init` accepts — including `brand`, `locale` and
`environment` — and merges them over the current values. Context and brand are read
when a conversation is created, so an `update` affects the *next* chat or form
submission (no logout/reboot needed for a language change).

---

## 6. Session resumption, attachments and ratings

These work out of the box, no host-app changes needed:

- **Resumption** — an active chat is stored in `localStorage` (`noddi_chat_session`)
  and resumes after a reload or navigation. `shutdown` clears it.
- **Unread badge** — agent replies that arrive while the widget is closed show a
  red count on the launcher.
- **Attachments** — visitors can attach images and PDFs up to 5 MB.
- **Rating** — after a chat ends the visitor can rate 1–5, leave a comment and have
  the transcript emailed to the address used for the chat.

---

## 7. Programmatic control

```js
NoddiWidget('open');    // or NoddiWidget.open()
NoddiWidget('close');
NoddiWidget('toggle');
NoddiWidget('clearIdentity');
NoddiWidget('shutdown');

NoddiWidget('isReady');               // boolean — true once the widget is mounted
NoddiWidget('onReady', () => { ... }); // fires immediately if already booted
```

`open` / `close` / `toggle` issued before boot are queued and replayed, so a custom
launcher can either queue them or gate its button on `isReady()` / `onReady`.

Custom launcher example:

```js
NoddiWidget('init', {
  widgetKey: 'YOUR_WIDGET_KEY',
  brand: 'Noddi Bilpleie',
  showButton: false,
  onReady: () => {
    document.querySelector('#help-button')
      .addEventListener('click', () => NoddiWidget('open'));
  }
});
```

---

## 8. Checklist for frontend implementors

- [ ] Script tag added with the queue stub before the async `widget.js`.
- [ ] `widgetKey` comes from config, not hardcoded per environment.
- [ ] `brand` passed on `init` and matches the Noddi brand catalog name/slug.
- [ ] Verified in Support Hub: start a test chat, confirm the brand badge (with logo) appears in the inbox list and conversation header.
- [ ] `environment` set so staging/dev chats are distinguishable in the live inbox.
- [ ] `locale`, `sourceApp` and (when logged in) `userId` passed for richer agent context.
- [ ] `bookingId` / `orderId` passed when the widget opens inside a booking or order flow.
- [ ] `identify` called after login and `shutdown` called on logout.
- [ ] `update` called when the user switches booking/car or navigates in a SPA.
- [ ] If using a custom launcher: `showButton: false` and enable the button from `onReady` / `isReady()`.
- [ ] Logout uses `clearIdentity` (not a full re-`init`).
- [ ] Host wrapper typed with `WidgetHostCommands` from `widget-host.d.ts`.

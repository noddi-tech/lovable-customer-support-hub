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

## 4. Programmatic control

```js
NoddiWidget('open');    // or NoddiWidget.open()
NoddiWidget('close');
NoddiWidget('toggle');
```

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

## 5. Checklist for frontend implementors

- [ ] Script tag added with the queue stub before the async `widget.js`.
- [ ] `widgetKey` comes from config, not hardcoded per environment.
- [ ] `brand` passed on `init` and matches the Noddi brand catalog name/slug.
- [ ] Verified in Support Hub: start a test chat, confirm the brand badge (with logo) appears in the inbox list and conversation header.
- [ ] If using a custom launcher: `showButton: false` and open via `onReady`.

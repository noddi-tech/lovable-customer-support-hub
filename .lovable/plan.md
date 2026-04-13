

# Attachment Previews & Download for All File Types

## What We're Building

Enhance the attachment list in email messages to show inline previews (where possible) and a consistent download button for all file types — images, PDFs, Excel/Sheets, and other documents.

## Current State

- Attachments render as a plain text list with filename, size, and a download button
- Image thumbnails exist in `ImageGallery`/`ImageThumbnail` but only for non-inline image attachments in `MessagesList` — not in the attachment list inside `EmailRender`
- No preview support for PDFs, spreadsheets, or other document types
- The `get-attachment` edge function returns the raw binary, which can be used for previews

## Plan

### 1. Create an `AttachmentPreviewCard` component

**New file: `src/components/ui/attachment-preview-card.tsx`**

A card component that replaces the current plain `<li>` in the attachments list. It determines the file type from `mimeType` and renders:

- **Images** (`image/*`): Thumbnail preview using `createBlobUrl` (same as `ImageThumbnail`), clickable to open lightbox
- **PDFs** (`application/pdf`): A small icon-based card with a PDF icon and filename. Clicking opens the PDF in a new browser tab via a blob URL from the `get-attachment` function
- **Spreadsheets** (`application/vnd.openxmlformats-officedocument.spreadsheetml.*`, `application/vnd.ms-excel`, etc.): Icon card with spreadsheet icon
- **Other files**: Generic file icon card with filename and size

All cards include a download button using the existing `AttachmentDownloadButton` logic.

The preview card is compact (~80px height) with the icon/thumbnail on the left and filename + size + download on the right.

### 2. Update `EmailRender` attachment list

**File: `src/components/ui/email-render.tsx`** (lines 624-663)

Replace the current `<ul>` list items with the new `AttachmentPreviewCard` component. Change from a vertical list to a responsive grid (`grid-cols-1 sm:grid-cols-2`) for better use of space.

### 3. Add a "Preview" action for PDFs and images

In `AttachmentPreviewCard`:
- **Images**: Click thumbnail → open lightbox (reuse existing `ImageLightbox`)
- **PDFs**: Click preview → fetch blob via `get-attachment`, create object URL, open `window.open(blobUrl)` in new tab. This works because the browser natively renders PDFs
- For files without `storageKey`, the on-demand Gmail fetch path is used (same as current download logic)

### Technical Details

**File type detection helper:**
```typescript
const getFileCategory = (mimeType: string, filename: string) => {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || filename?.endsWith('.pdf')) return 'pdf';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || 
      filename?.match(/\.(xlsx?|csv)$/i)) return 'spreadsheet';
  if (mimeType?.includes('document') || mimeType?.includes('word') || 
      filename?.match(/\.(docx?|txt)$/i)) return 'document';
  return 'other';
};
```

**Preview card layout:**
```text
┌──────────────────────────────────────┐
│ [Icon/Thumb]  filename.pdf           │
│               125.3 KB               │
│               [Preview] [Download]   │
└──────────────────────────────────────┘
```

**Files to create/modify:**
- **New**: `src/components/ui/attachment-preview-card.tsx`
- **Edit**: `src/components/ui/email-render.tsx` — replace attachment list rendering
- **No backend changes needed** — existing `get-attachment` and `fetch-gmail-attachment` functions handle all file types already

### PDF Handling Answer

Yes — PDFs are fully supported. The `get-attachment` edge function returns raw binary for any file type. The browser can natively render PDFs when opened via blob URL in a new tab. The on-demand Gmail fetch (`fetch-gmail-attachment`) also returns any attachment type, not just images. So PDFs work today for download, and with this change they'll also have a preview action.


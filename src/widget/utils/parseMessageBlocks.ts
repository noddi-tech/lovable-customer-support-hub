export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'action_menu'; options: string[] }
  | { type: 'phone_verify' }
  | { type: 'yes_no'; question: string }
  | { type: 'email_input' }
  | { type: 'text_input'; placeholder: string }
  | { type: 'rating' }
  | { type: 'confirm'; summary: string };

interface MarkerDef {
  tag: string;
  hasClosing: boolean;
  closingTag?: string;
  parse: (inner: string) => MessageBlock;
}

const MARKERS: MarkerDef[] = [
  { tag: '[PHONE_VERIFY]', hasClosing: false, parse: () => ({ type: 'phone_verify' }) },
  { tag: '[EMAIL_INPUT]', hasClosing: false, parse: () => ({ type: 'email_input' }) },
  { tag: '[RATING]', hasClosing: false, parse: () => ({ type: 'rating' }) },
  {
    tag: '[ACTION_MENU]', hasClosing: true, closingTag: '[/ACTION_MENU]',
    parse: (inner) => {
      const options = inner.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      return { type: 'action_menu', options };
    },
  },
  {
    tag: '[YES_NO]', hasClosing: true, closingTag: '[/YES_NO]',
    parse: (inner) => ({ type: 'yes_no', question: inner.trim() }),
  },
  {
    tag: '[TEXT_INPUT]', hasClosing: true, closingTag: '[/TEXT_INPUT]',
    parse: (inner) => ({ type: 'text_input', placeholder: inner.trim() }),
  },
  {
    tag: '[CONFIRM]', hasClosing: true, closingTag: '[/CONFIRM]',
    parse: (inner) => ({ type: 'confirm', summary: inner.trim() }),
  },
];

/**
 * Parses AI response content into typed blocks.
 * Detects marker tags and converts them into structured blocks.
 * Everything outside markers becomes text blocks.
 */
export function parseMessageBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Find earliest marker
    let earliest: { marker: MarkerDef; idx: number } | null = null;
    for (const marker of MARKERS) {
      const idx = remaining.indexOf(marker.tag);
      if (idx !== -1 && (!earliest || idx < earliest.idx)) {
        earliest = { marker, idx };
      }
    }

    if (!earliest) {
      if (remaining.trim()) blocks.push({ type: 'text', content: remaining });
      break;
    }

    // Text before the marker
    const before = remaining.slice(0, earliest.idx);
    if (before.trim()) blocks.push({ type: 'text', content: before });

    if (!earliest.marker.hasClosing) {
      // Self-closing marker
      blocks.push(earliest.marker.parse(''));
      remaining = remaining.slice(earliest.idx + earliest.marker.tag.length);
    } else {
      // Marker with closing tag
      const afterOpen = remaining.slice(earliest.idx + earliest.marker.tag.length);
      const closeIdx = afterOpen.indexOf(earliest.marker.closingTag!);

      if (closeIdx === -1) {
        // Malformed — treat rest as text
        blocks.push({ type: 'text', content: remaining.slice(earliest.idx) });
        break;
      }

      const inner = afterOpen.slice(0, closeIdx);
      const block = earliest.marker.parse(inner);
      // Only push if the block has meaningful content (or is always valid)
      if (block.type === 'action_menu') {
        if ((block as any).options.length > 0) blocks.push(block);
      } else {
        blocks.push(block);
      }

      remaining = afterOpen.slice(closeIdx + earliest.marker.closingTag!.length);
    }
  }

  if (blocks.length === 0 && content.trim()) {
    return [{ type: 'text', content }];
  }

  return blocks;
}

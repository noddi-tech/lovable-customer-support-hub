import { getAllBlocks } from '../components/blocks';

export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: string; [key: string]: any };

// Build MARKERS dynamically from the block registry
interface MarkerDef {
  tag: string;
  hasClosing: boolean;
  closingTag?: string;
  parse: (inner: string) => MessageBlock;
}

function buildMarkers(): MarkerDef[] {
  return getAllBlocks().map(def => ({
    tag: def.marker,
    hasClosing: !!def.closingMarker,
    closingTag: def.closingMarker,
    parse: (inner: string) => ({ type: def.type, ...def.parseContent(inner) }),
  }));
}

/**
 * Parses AI response content into typed blocks.
 * Detects marker tags and converts them into structured blocks.
 * Everything outside markers becomes text blocks.
 */
export function parseMessageBlocks(content: string): MessageBlock[] {
  const MARKERS = buildMarkers();
  const blocks: MessageBlock[] = [];

  // Pre-process: collapse newlines/whitespace between opening and closing marker tags
  // This handles cases where the AI inserts line breaks inside markers
  let normalized = content;
  for (const marker of MARKERS) {
    if (marker.hasClosing && marker.closingTag) {
      // Match: [TAG]...content...\n\s*[/TAG] -> [TAG]...content...[/TAG]
      const openEscaped = marker.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const closeEscaped = marker.closingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${openEscaped}(?:.|\\n)*?)\\s*\\n\\s*(${closeEscaped})`, 'g');
      normalized = normalized.replace(re, '$1$2');
    }
  }

  // Fix common AI mistake: [TAG]content[TAG] -> [TAG]content[/TAG]
  // Only activates when correct closing tag is absent AND opening tag appears 2+ times
  for (const marker of MARKERS) {
    if (marker.hasClosing && marker.closingTag) {
      if (!normalized.includes(marker.closingTag) && 
          normalized.split(marker.tag).length > 2) {
        const lastIdx = normalized.lastIndexOf(marker.tag);
        normalized = normalized.substring(0, lastIdx) + 
                     marker.closingTag + 
                     normalized.substring(lastIdx + marker.tag.length);
      }
    }
  }

  let remaining = normalized;

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
        if ((block as any).options?.length > 0) blocks.push(block);
      } else {
        blocks.push(block);
      }

      remaining = afterOpen.slice(closeIdx + earliest.marker.closingTag!.length);
    }
  }

  if (blocks.length === 0 && content.trim()) {
    return [{ type: 'text', content }];
  }

  // Strip text blocks that are just leftover marker tags
  const markerTags = new Set(MARKERS.flatMap(m => [m.tag, m.closingTag].filter(Boolean) as string[]));
  return blocks.filter(b => {
    if (b.type !== 'text') return true;
    const trimmed = (b as any).content?.trim();
    if (!trimmed) return false;
    // Exact match: text is just a marker tag
    if (markerTags.has(trimmed)) return false;
    // Text block is only marker tags with whitespace — strip all tags and check
    let stripped = trimmed;
    for (const tag of markerTags) {
      stripped = stripped.replaceAll(tag, '');
    }
    if (stripped.trim().length === 0) return false;
    return true;
  });
}

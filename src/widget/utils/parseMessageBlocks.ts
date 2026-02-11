export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'action_menu'; options: string[] }
  | { type: 'phone_verify' };

/**
 * Parses AI response content into typed blocks.
 * Detects [ACTION_MENU]...[/ACTION_MENU] and [PHONE_VERIFY] markers.
 * Everything outside markers becomes text blocks.
 */
export function parseMessageBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Find the next marker
    const phoneIdx = remaining.indexOf('[PHONE_VERIFY]');
    const actionIdx = remaining.indexOf('[ACTION_MENU]');

    // Determine which comes first
    const candidates: { type: string; idx: number }[] = [];
    if (phoneIdx !== -1) candidates.push({ type: 'phone', idx: phoneIdx });
    if (actionIdx !== -1) candidates.push({ type: 'action', idx: actionIdx });

    if (candidates.length === 0) {
      // No more markers — rest is text
      if (remaining.trim()) {
        blocks.push({ type: 'text', content: remaining });
      }
      break;
    }

    // Pick the earliest marker
    candidates.sort((a, b) => a.idx - b.idx);
    const first = candidates[0];

    // Text before the marker
    const before = remaining.slice(0, first.idx);
    if (before.trim()) {
      blocks.push({ type: 'text', content: before });
    }

    if (first.type === 'phone') {
      blocks.push({ type: 'phone_verify' });
      remaining = remaining.slice(first.idx + '[PHONE_VERIFY]'.length);
    } else {
      // Action menu — find closing tag
      const afterOpen = remaining.slice(first.idx + '[ACTION_MENU]'.length);
      const closeIdx = afterOpen.indexOf('[/ACTION_MENU]');

      if (closeIdx === -1) {
        // Malformed — treat rest as text
        blocks.push({ type: 'text', content: remaining.slice(first.idx) });
        break;
      }

      const optionsText = afterOpen.slice(0, closeIdx).trim();
      const options = optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (options.length > 0) {
        blocks.push({ type: 'action_menu', options });
      }

      remaining = afterOpen.slice(closeIdx + '[/ACTION_MENU]'.length);
    }
  }

  // If no blocks were created, return the original as text
  if (blocks.length === 0 && content.trim()) {
    return [{ type: 'text', content }];
  }

  return blocks;
}

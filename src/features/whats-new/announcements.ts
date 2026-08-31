import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Announcement {
  /** Stable id — never reuse or rename, it is what we store as "seen". */
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Optional keyboard shortcut hint rendered as keycaps. */
  shortcut?: string[];
  bullets?: string[];
}

/**
 * New features shown once per user the first time they open the app after
 * the feature shipped. Add new entries at the top.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'quick-inbox-switcher-cmd-i',
    title: 'Quick inbox switcher',
    description:
      'Jump between inboxes without leaving the keyboard. Press the shortcut anywhere in the app to open the switcher.',
    icon: Inbox,
    shortcut: ['⌘', 'I'],
    bullets: [
      'Each inbox has a number — press it to switch instantly',
      'Alt + click (or Alt + number) combines several inboxes into one view',
      'Open and pending counts are shown per inbox',
    ],
  },
];

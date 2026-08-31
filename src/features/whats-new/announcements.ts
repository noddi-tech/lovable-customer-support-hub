import { Inbox, Briefcase, UserSearch, History as HistoryIcon } from 'lucide-react';
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
    id: 'cases-and-customer-record-2026-08',
    title: 'Cases: follow-up that survives the thread',
    description:
      'Email, chat and calls can now be tied to a Case — a single piece of work with an owner, a due date and a resolution. Threads close, cases stay until the customer issue is actually done.',
    icon: Briefcase,
    bullets: [
      'Link or create a case straight from the conversation side panel — the case chip in the header shows status and SLA',
      'Replying to a customer now claims the conversation and its case for you, and stamps first response time',
      'Operations → Cases gives you My cases, Overdue, Unassigned and Waiting queues',
      'Closing a case requires a resolution code, so reporting on contact reasons actually works',
    ],
  },
  {
    id: 'customer-record-360-2026-08',
    title: 'Full customer history',
    description:
      'Every email address and phone number we have seen for a customer is now merged into one record, with a timeline across all channels.',
    icon: UserSearch,
    bullets: [
      '"Previous contacts" in the conversation side panel shows earlier threads, calls and cases',
      'Customer notes are shared and persistent — no longer lost per thread',
      'Open the full 360 view from the customer name to see identities, cases, calls and notes',
    ],
  },
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
  {
    id: 'unified-customer-timeline-chat-2026-09',
    title: 'One timeline across email, chat and phone',
    description:
      'Live chat now has the same case tools as email, and the side panel shows one merged history of every interaction with that customer.',
    icon: HistoryIcon,
    bullets: [
      'Live chat gets a right-hand panel with the linked case and the full customer history',
      'Filter the timeline by email, chat, phone, notes or cases — click any row to open it',
      'A case now lists its conversations, chat sessions and calls together',
      'Operations → Cases shows how many open cases you own',
    ],
  },
];

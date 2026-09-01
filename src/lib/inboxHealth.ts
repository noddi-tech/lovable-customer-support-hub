/**
 * Turns an inbox's live workload (SLA risk + backlog) into a simple 5-step
 * health signal, so a glance at the home screen tells you where to jump in.
 */
export type InboxHealthLevel = 'calm' | 'steady' | 'busy' | 'strained' | 'critical';

export interface InboxHealth {
  level: InboxHealthLevel;
  emoji: string;
  label: string;
  description: string;
}

export interface InboxHealthInput {
  open: number;
  unread: number;
  breached?: number;
  atRisk?: number;
}

const HEALTH: Record<InboxHealthLevel, Omit<InboxHealth, 'level'>> = {
  calm: {
    emoji: '😄',
    label: 'All clear',
    description: 'Nothing waiting and no SLA pressure — this inbox is fully under control.',
  },
  steady: {
    emoji: '🙂',
    label: 'Steady',
    description: 'A light, healthy queue. Everything is comfortably within its reply deadline.',
  },
  busy: {
    emoji: '😐',
    label: 'Busy',
    description: 'The queue is building up. No deadlines broken yet, but it needs attention today.',
  },
  strained: {
    emoji: '😰',
    label: 'Under pressure',
    description: 'Replies are about to miss their SLA, or the backlog is piling up. Act soon.',
  },
  critical: {
    emoji: '🔥',
    label: 'Crisis',
    description: 'SLAs are already broken or the backlog is out of hand. This inbox needs help now.',
  },
};

export function getInboxHealth({ open, unread, breached = 0, atRisk = 0 }: InboxHealthInput): InboxHealth {
  let level: InboxHealthLevel;

  if (breached > 0 || open >= 75) {
    level = 'critical';
  } else if (atRisk > 0 || open >= 40 || unread >= 25) {
    level = 'strained';
  } else if (open >= 15 || unread >= 10) {
    level = 'busy';
  } else if (open > 0 || unread > 0) {
    level = 'steady';
  } else {
    level = 'calm';
  }

  return { level, ...HEALTH[level] };
}

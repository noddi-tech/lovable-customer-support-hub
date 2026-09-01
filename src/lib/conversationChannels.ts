import {
  Facebook,
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  type LucideIcon,
} from 'lucide-react';

export interface ChannelMeta {
  /** Short label shown on rows and filter chips. */
  label: string;
  icon: LucideIcon;
  /** Plain-English explanation shown on hover. */
  description: string;
}

/**
 * Single source of truth for how a conversation channel is named and drawn.
 * The "Inbox" view mixes several of these, so every row must say which one it is.
 */
export const CHANNEL_META: Record<string, ChannelMeta> = {
  email: {
    label: 'Email',
    icon: Mail,
    description: 'Arrived by email and is answered by email.',
  },
  sms: {
    label: 'SMS',
    icon: MessageSquare,
    description: 'Arrived as a text message (SMS) and is answered by SMS.',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    description: 'Arrived through WhatsApp.',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    description: 'Arrived from a Facebook page message.',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    description: 'Arrived from an Instagram direct message.',
  },
  widget: {
    label: 'Live chat',
    icon: Globe,
    description: 'Started in the website chat widget — handled in the Chat section.',
  },
  voice: {
    label: 'Voice',
    icon: Phone,
    description: 'Phone call handled by the voice integration.',
  },
  other: {
    label: 'Other',
    icon: MessageCircle,
    description: 'Came in through another channel.',
  },
};

export function channelMeta(channel?: string | null): ChannelMeta {
  return (channel && CHANNEL_META[channel]) || CHANNEL_META.other;
}

export function channelLabel(channel?: string | null): string {
  return channelMeta(channel).label;
}

export function channelIcon(channel?: string | null): LucideIcon {
  return channelMeta(channel).icon;
}

/** Channels grouped under "Social" in the filter chips. */
export const SOCIAL_CHANNELS = ['facebook', 'instagram'] as const;

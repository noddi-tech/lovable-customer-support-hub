import { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConversationList } from '@/contexts/ConversationListContext';
import { channelMeta, SOCIAL_CHANNELS } from '@/lib/conversationChannels';

/** Chip order in the Inbox list. 'social' folds Facebook + Instagram together. */
const CHIP_ORDER = ['email', 'sms', 'whatsapp', 'social'] as const;

function chipChannels(chip: string): string[] {
  return chip === 'social' ? [...SOCIAL_CHANNELS] : [chip];
}

/**
 * "All · Email · SMS · WhatsApp · Social" row above the conversation list.
 * The Inbox view mixes channels, so this is how you narrow it to one of them
 * without splitting the navigation.
 */
export function ChannelFilterChips() {
  const { filteredConversations, state, dispatch } = useConversationList();

  // Counts ignore the channel filter itself so the chips never collapse to zero.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    filteredConversations.forEach((c) => {
      const key = SOCIAL_CHANNELS.includes(c.channel as never) ? 'social' : c.channel;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [filteredConversations]);

  const visibleChips = CHIP_ORDER.filter(
    (chip) => (counts.get(chip) ?? 0) > 0 || state.channelFilter === chip,
  );

  // Nothing to disambiguate when everything is the same channel.
  if (visibleChips.length < 2) return null;

  const total = filteredConversations.length;

  const chip = (
    key: string,
    label: string,
    count: number,
    description: string,
    Icon: React.ComponentType<{ className?: string }>,
  ) => (
    <Tooltip key={key}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_CHANNEL_FILTER', payload: key })}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
            state.channelFilter === key
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent',
          )}
        >
          <Icon className="h-3 w-3" />
          <span>{label}</span>
          <span className="tabular-nums opacity-70">{count}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
        {description}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-1.5">
        {chip('all', 'All', total, 'Every conversation in this inbox, whatever channel it came from.', Inbox)}
        {visibleChips.map((c) => {
          const meta = channelMeta(chipChannels(c)[0]);
          const label = c === 'social' ? 'Social' : meta.label;
          const description =
            c === 'social'
              ? 'Facebook and Instagram messages.'
              : meta.description;
          return chip(c, label, counts.get(c) ?? 0, description, meta.icon);
        })}
      </div>
    </TooltipProvider>
  );
}

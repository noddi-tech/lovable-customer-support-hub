import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Sparkles, Zap, PartyPopper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';

const CELEBRATION_MESSAGES = [
  { icon: Trophy, text: "Inbox Zero! You're a support legend 🏆" },
  { icon: PartyPopper, text: "All clear! Time for a victory dance 💃" },
  { icon: Sparkles, text: "Nothing to see here — you crushed it ✨" },
  { icon: Trophy, text: "Zero tickets. Maximum hero energy 🦸" },
  { icon: PartyPopper, text: "Clean inbox, clean mind 🧘" },
  { icon: Sparkles, text: "You did it! Customer support royalty 👑" },
];

const CONFETTI_COLORS = [
  'bg-primary', 'bg-success', 'bg-warning', 'bg-accent',
  'bg-primary/70', 'bg-success/70', 'bg-warning/70',
];

const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const style = useMemo(() => ({
    left: `${10 + (index * 13) % 80}%`,
    animationDelay: `${index * 0.15}s`,
    animationDuration: `${1.5 + (index % 3) * 0.5}s`,
  }), [index]);

  return (
    <div
      className={`absolute w-2 h-2 rounded-full ${CONFETTI_COLORS[index % CONFETTI_COLORS.length]} animate-confetti-fall opacity-0`}
      style={style}
    />
  );
};

export const InboxZeroCelebration: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(() => Math.floor(Math.random() * CELEBRATION_MESSAGES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % CELEBRATION_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const current = CELEBRATION_MESSAGES[messageIndex];
  const Icon = current.icon;

  return (
    <div className="flex items-center justify-center h-48 relative overflow-hidden">
      {/* Confetti particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}

      <div className="text-center z-10 animate-scale-in">
        {/* Sparkle ring */}
        <div className="relative inline-block mb-3">
          <div className="absolute -inset-3 animate-spin-slow">
            <Sparkles className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 text-warning animate-pulse" />
            <Sparkles className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 text-primary animate-pulse [animation-delay:0.3s]" />
            <Sparkles className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 text-success animate-pulse [animation-delay:0.6s]" />
            <Sparkles className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 text-accent animate-pulse [animation-delay:0.9s]" />
          </div>
          <Icon className="w-10 h-10 text-primary animate-bounce-gentle" />
        </div>

        {/* Rotating message */}
        <p
          key={messageIndex}
          className="text-base font-semibold text-foreground animate-fade-in"
        >
          {current.text}
        </p>
        <p className="text-xs text-muted-foreground mt-1 animate-fade-in [animation-delay:0.2s]">
          All conversations handled. You're on top of it!
        </p>
      </div>
    </div>
  );
};

interface AlmostThereBannerProps {
  count: number;
  total?: number;
}

export const AlmostThereBanner: React.FC<AlmostThereBannerProps> = ({ count }) => {
  if (count > 5 || count <= 0) return null;

  const progressValue = Math.max(0, ((5 - count) / 5) * 100);

  const getMessage = () => {
    if (count === 1) return "Last one! You're about to hit Inbox Zero ⚡";
    if (count === 2) return "Just 2 left — you're on fire 🔥";
    if (count === 3) return "Only 3 to go! Keep that momentum 💪";
    return `Almost there! Just ${count} left — you've got this 🚀`;
  };

  return (
    <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
      <div className="flex items-center gap-2 mb-1.5">
        <Zap className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-xs font-medium text-foreground">{getMessage()}</span>
      </div>
      <Progress value={progressValue} className="h-1.5 bg-muted" />
    </div>
  );
};

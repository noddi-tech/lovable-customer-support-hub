import { useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import type { EmailTemplate } from './types';
import type { Stage } from '../pipeline/types';
import { EmailTemplateListRow } from './EmailTemplateListRow';

interface Props {
  templates: EmailTemplate[];
  selectedId: string | null;
  hasAnyTemplates: boolean;
  stages: Stage[] | undefined;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function EmailTemplateList({
  templates,
  selectedId,
  hasAnyTemplates,
  stages,
  onSelect,
  isLoading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation: arrow keys move selection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (!templates.length) return;
      const idx = templates.findIndex((t) => t.id === selectedId);
      e.preventDefault();
      const nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(templates.length - 1, idx + 1)
          : Math.max(0, idx - 1);
      const next = templates[nextIdx];
      if (next && next.id !== selectedId) onSelect(next.id);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [templates, selectedId, onSelect]);

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground p-4">Laster maler...</div>
    );
  }

  if (!hasAnyTemplates) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 gap-3 text-muted-foreground">
        <Mail className="h-10 w-10 opacity-40" />
        <p className="text-sm">
          Ingen maler ennå. Opprett den første med 'Ny mal'.
        </p>
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 gap-3 text-muted-foreground">
        <Mail className="h-10 w-10 opacity-40" />
        <p className="text-sm">
          Ingen maler matcher søket. Prøv et annet søk eller endre filteret.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="space-y-1.5 focus:outline-none"
      role="listbox"
      aria-label="E-postmaler"
    >
      {templates.map((t) => (
        <EmailTemplateListRow
          key={t.id}
          template={t}
          stages={stages}
          selected={t.id === selectedId}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </div>
  );
}

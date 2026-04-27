import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  organizationId: string | null;
  value: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
}

export function ApplicantAuditPicker({ organizationId, value, onChange }: Props) {
  const [search, setSearch] = useState(value?.label ?? '');
  const [debounced, setDebounced] = useState(search);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ['applicant-search', organizationId, debounced],
    enabled: !!organizationId && debounced.length >= 2,
    queryFn: async () => {
      const term = `%${debounced}%`;
      const { data, error } = await (supabase as any)
        .from('applicants')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organizationId)
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; first_name: string; last_name: string; email: string }>;
    },
  });

  return (
    <div className="space-y-1 relative">
      <Label className="text-xs">Søker</Label>
      <Input
        value={search}
        placeholder="Søk på navn eller e-post (min 2 tegn)…"
        onChange={(e) => { setSearch(e.target.value); setOpen(true); if (value) onChange(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && data && data.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-72 overflow-auto rounded-md border bg-popover shadow-lg">
          {data.map((a) => {
            const label = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email;
            return (
              <button
                key={a.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ id: a.id, label });
                  setSearch(label);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{a.email}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

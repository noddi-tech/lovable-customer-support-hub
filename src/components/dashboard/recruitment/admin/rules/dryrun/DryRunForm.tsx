import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TRIGGER_LABELS } from '../types';
import { useApplicantsSearch } from './hooks/useApplicantsSearch';
import { useRuleCountByTrigger } from './hooks/useRuleCountByTrigger';
import { useStages } from './hooks/useStages';
import type { ApplicantSearchResult, DryRunTriggerType } from './types';
import { getApplicantDisplayName } from './types';

interface Props {
  triggerType: DryRunTriggerType;
  stageId: string | null;
  applicant: ApplicantSearchResult | null;
  isPending: boolean;
  onTriggerTypeChange: (value: DryRunTriggerType) => void;
  onStageChange: (value: string | null) => void;
  onApplicantChange: (value: ApplicantSearchResult | null) => void;
  onRun: () => void;
  onClear: () => void;
}

function StagePill({ name, color }: { name: string | null; color: string | null }) {
  if (!name) {
    return <span className="text-xs text-muted-foreground">Uten fase</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className="inline-block h-2 w-2 rounded-full border border-border/60"
        style={color ? { backgroundColor: color } : undefined}
      />
      {name}
    </span>
  );
}

export function DryRunForm({
  triggerType,
  stageId,
  applicant,
  isPending,
  onTriggerTypeChange,
  onStageChange,
  onApplicantChange,
  onRun,
  onClear,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stages, isLoading: stagesLoading } = useStages();
  const { data: applicants, isLoading: applicantsLoading } = useApplicantsSearch(searchQuery);
  const { data: ruleCounts = {} } = useRuleCountByTrigger();

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
    }
  }, [searchOpen]);

  const selectedApplicantLabel = useMemo(() => {
    if (!applicant) return 'Søk etter søker...';
    return applicant.email
      ? `${getApplicantDisplayName(applicant)} · ${applicant.email}`
      : getApplicantDisplayName(applicant);
  }, [applicant]);

  const isRunDisabled = isPending || !applicant?.id || (triggerType === 'stage_entered' && !stageId);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dry-run-trigger-type">Type utløser</Label>
          <Select value={triggerType} onValueChange={(value) => onTriggerTypeChange(value as DryRunTriggerType)}>
            <SelectTrigger id="dry-run-trigger-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TRIGGER_LABELS) as DryRunTriggerType[]).map((key) => {
                const count = ruleCounts[key] ?? 0;
                return (
                  <SelectItem key={key} value={key}>
                    {TRIGGER_LABELS[key]}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({count} {count === 1 ? 'regel' : 'regler'})
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {triggerType === 'stage_entered' ? (
          <div className="space-y-1.5">
            <Label htmlFor="dry-run-stage">Hvilken fase</Label>
            {stagesLoading ? (
              <div className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Laster faser...
              </div>
            ) : (
              <Select value={stageId ?? ''} onValueChange={onStageChange}>
                <SelectTrigger id="dry-run-stage">
                  <SelectValue placeholder="Velg fase..." />
                </SelectTrigger>
                <SelectContent>
                  {(stages ?? []).map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full border border-border/60"
                          style={stage.color ? { backgroundColor: stage.color } : undefined}
                        />
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dry-run-applicant-search">Søker</Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              id="dry-run-applicant-search"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full justify-between px-3 text-left font-normal"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{selectedApplicantLabel}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Søk på navn eller e-post..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {searchQuery.trim().length < 2 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Skriv minst 2 tegn for å søke.
                  </div>
                ) : applicantsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Laster søkere...
                  </div>
                ) : (
                  <>
                    <CommandEmpty>Ingen søkere funnet.</CommandEmpty>
                    <CommandGroup>
                      {(applicants ?? []).map((item) => {
                        const isSelected = applicant?.id === item.id;

                        return (
                          <CommandItem
                            key={item.id}
                            value={`${getApplicantDisplayName(item)} ${item.email ?? ''}`}
                            onSelect={() => {
                              onApplicantChange(item);
                              setSearchOpen(false);
                            }}
                            className="items-start gap-2 py-3"
                          >
                            <Check className={cn('mt-0.5 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate font-medium">{getApplicantDisplayName(item)}</span>
                                <StagePill name={item.current_stage_name} color={item.current_stage_color} />
                              </div>
                              <div className="truncate text-xs text-muted-foreground">{item.email ?? 'Ingen e-post'}</div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {applicant ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-2 font-normal">
              <span>{selectedApplicantLabel}</span>
              <button
                type="button"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => onApplicantChange(null)}
                aria-label="Fjern valgt søker"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
            <StagePill name={applicant.current_stage_name} color={applicant.current_stage_color} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClear} disabled={isPending}>
          Tøm
        </Button>
        <Button type="button" onClick={onRun} disabled={isRunDisabled}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Kjør test
        </Button>
      </div>
    </div>
  );
}

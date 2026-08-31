import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useCustomersList, customerSortName, type CustomerListRow } from '@/hooks/useCustomersList';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface PickedCustomer {
  id: string;
  label: string;
}

interface CaseCustomerPickerProps {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  disabled?: boolean;
}

function labelFor(c: Pick<CustomerListRow, 'full_name' | 'email' | 'phone'>): string {
  return c.full_name || c.email || c.phone || 'Unnamed customer';
}

/**
 * Searchable customer selector used when creating a case. A case must always be
 * tied to a customer, so this also supports creating a new customer inline.
 */
export function CaseCustomerPicker({ value, onChange, disabled }: CaseCustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading } = useCustomersList(search);

  const sorted = [...customers].sort((a, b) => customerSortName(a).localeCompare(customerSortName(b)));
  const term = search.trim();
  const canCreate = term.length > 1 && !sorted.some((c) => labelFor(c).toLowerCase() === term.toLowerCase());

  const handleCreate = async () => {
    if (!profile?.organization_id) {
      toast.error('Missing organization');
      return;
    }
    setCreating(true);
    try {
      const isEmail = /\S+@\S+\.\S+/.test(term);
      const { data, error } = await (supabase.from('customers') as any)
        .insert({
          organization_id: profile.organization_id,
          email: isEmail ? term.toLowerCase() : null,
          full_name: isEmail ? null : term,
        })
        .select('id, full_name, email, phone')
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      onChange({ id: data.id, label: labelFor(data) });
      setOpen(false);
      setSearch('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create customer');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('flex min-w-0 items-center gap-2', !value && 'text-muted-foreground')}>
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{value ? value.label : 'Search customer by name, email or phone'}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search customers…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Searching…</div>
            ) : (
              <CommandEmpty>No customers found.</CommandEmpty>
            )}
            <CommandGroup>
              {sorted.slice(0, 50).map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange({ id: c.id, label: labelFor(c) });
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">
                    {labelFor(c)}
                    {c.full_name && c.email ? (
                      <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && (
              <CommandGroup heading="Create">
                <CommandItem value="__create__" disabled={creating} onSelect={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create customer “{term}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Resolves a customer id to a display label (used to prefill the picker). */
export function useCustomerBasics(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-basics', customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<PickedCustomer | null> => {
      const { data, error } = await (supabase.from('customers') as any)
        .select('id, full_name, email, phone')
        .eq('id', customerId)
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, label: labelFor(data) } : null;
    },
  });
}

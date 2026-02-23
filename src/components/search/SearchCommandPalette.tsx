import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/useDebounce';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { MessageSquare, User, Mail, Loader2, ExternalLink } from 'lucide-react';
import { stripHtml } from '@/utils/stripHtml';

interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const conversations = useGlobalSearch({
    query: debouncedQuery,
    type: 'conversations',
    enabled: open,
  });

  const customers = useGlobalSearch({
    query: debouncedQuery,
    type: 'customers',
    enabled: open,
  });

  const messages = useGlobalSearch({
    query: debouncedQuery,
    type: 'messages',
    enabled: open,
  });

  const isLoading =
    conversations.isLoading || customers.isLoading || messages.isLoading;

  const convResults = (conversations.data?.pages?.[0]?.results ?? []).slice(0, 5);
  const custResults = (customers.data?.pages?.[0]?.results ?? []).slice(0, 5);
  const msgResults = (messages.data?.pages?.[0]?.results ?? []).slice(0, 5);

  const hasResults = convResults.length > 0 || custResults.length > 0 || msgResults.length > 0;

  const select = useCallback(
    (path: string) => {
      onOpenChange(false);
      setQuery('');
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setQuery('');
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder={t(
          'dashboard.search.placeholder',
          'Search by customer, subject, or content…',
        )}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Loading state */}
        {isLoading && debouncedQuery.length >= 2 && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching…
          </div>
        )}

        {/* Empty state */}
        {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
          <CommandEmpty>
            {t('dashboard.search.noResults', 'No results found.')}
          </CommandEmpty>
        )}

        {/* Prompt when query is too short */}
        {debouncedQuery.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t('dashboard.search.hint', 'Type at least 2 characters to search…')}
          </div>
        )}

        {/* Conversations */}
        {convResults.length > 0 && (
          <CommandGroup heading="Conversations">
            {convResults.map((r) => (
              <CommandItem
                key={r.id}
                value={`conv-${r.id}`}
                onSelect={() =>
                  select(
                    `/interactions/text/open?conversationId=${r.id}`,
                  )
                }
              >
                <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium text-sm">
                    {r.subject || '(no subject)'}
                  </span>
                  {r.customer_name && (
                    <span className="truncate text-xs text-muted-foreground">
                      {r.customer_name}
                      {r.customer_email ? ` · ${r.customer_email}` : ''}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Customers */}
        {custResults.length > 0 && (
          <>
            {convResults.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Customers">
              {custResults.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`cust-${r.id}`}
                  onSelect={() => select(`/customers/${r.id}`)}
                >
                  <User className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium text-sm">
                      {r.customer_name || r.customer_email || 'Unknown'}
                    </span>
                    {r.customer_email && r.customer_name && (
                      <span className="truncate text-xs text-muted-foreground">
                        {r.customer_email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Messages */}
        {msgResults.length > 0 && (
          <>
            {(convResults.length > 0 || custResults.length > 0) && (
              <CommandSeparator />
            )}
            <CommandGroup heading="Messages">
              {msgResults.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`msg-${r.id}`}
                  onSelect={() =>
                    select(
                      `/interactions/text/open?conversationId=${r.conversation_id}`,
                    )
                  }
                >
                  <Mail className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium text-sm">
                      {r.subject || '(no subject)'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground line-clamp-1">
                      {stripHtml(r.content)?.substring(0, 120)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* View all link */}
        {hasResults && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="view-all-results"
                onSelect={() =>
                  select(`/search?q=${encodeURIComponent(debouncedQuery)}`)
                }
              >
                <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  View all results for "{debouncedQuery}"
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

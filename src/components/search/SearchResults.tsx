import { memo } from 'react';
import { Mail, User, MessageSquare, Clock, Inbox, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { SearchResult } from '@/hooks/useGlobalSearch';

interface SearchResultsProps {
  results: SearchResult[];
  type: 'conversations' | 'customers' | 'messages';
  query: string;
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onSelectConversation?: (id: string) => void;
  onSelectCustomer?: (id: string) => void;
}

// Highlight matching text
const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query || !text) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const ConversationResult = memo(({ 
  result, 
  query, 
  onSelect 
}: { 
  result: SearchResult; 
  query: string;
  onSelect?: (id: string) => void;
}) => (
  <button
    onClick={() => onSelect?.(result.id)}
    className="w-full p-4 text-left hover:bg-accent/50 border-b transition-colors"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Mail className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">
            <HighlightText text={result.customer_name || result.customer_email || 'Unknown'} query={query} />
          </span>
          {result.status && (
            <Badge variant={result.status === 'open' ? 'default' : 'secondary'} className="text-xs">
              {result.status}
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium truncate">
          <HighlightText text={result.subject || 'No subject'} query={query} />
        </p>
        {result.preview && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            <HighlightText text={result.preview} query={query} />
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {result.inbox_name && (
            <span className="flex items-center gap-1">
              <Inbox className="w-3 h-3" />
              {result.inbox_name}
            </span>
          )}
          {result.updated_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  </button>
));

const CustomerResult = memo(({ 
  result, 
  query,
  onSelect 
}: { 
  result: SearchResult; 
  query: string;
  onSelect?: (id: string) => void;
}) => (
  <button
    onClick={() => onSelect?.(result.id)}
    className="w-full p-4 text-left hover:bg-accent/50 border-b transition-colors"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-secondary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          <HighlightText text={result.customer_name || 'Unknown'} query={query} />
        </p>
        <p className="text-sm text-muted-foreground truncate">
          <HighlightText text={result.customer_email || ''} query={query} />
        </p>
        {result.conversation_count !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {result.conversation_count} conversation{result.conversation_count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  </button>
));

const MessageResult = memo(({ 
  result, 
  query,
  onSelect 
}: { 
  result: SearchResult; 
  query: string;
  onSelect?: (id: string) => void;
}) => (
  <button
    onClick={() => onSelect?.(result.conversation_id || result.id)}
    className="w-full p-4 text-left hover:bg-accent/50 border-b transition-colors"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">
            {result.customer_name || result.customer_email || 'Unknown'}
          </span>
          <Badge variant="outline" className="text-xs">
            {result.sender_type || 'message'}
          </Badge>
        </div>
        {result.subject && (
          <p className="text-sm truncate">
            <HighlightText text={result.subject} query={query} />
          </p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          <HighlightText text={result.content || result.preview || ''} query={query} />
        </p>
        {result.created_at && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  </button>
));

export const SearchResults = ({
  results,
  type,
  query,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectConversation,
  onSelectCustomer,
}: SearchResultsProps) => {
  const { t } = useTranslation();
  
  if (results.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Mail className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-lg">{t('search.noResults', 'No results found')}</p>
        <p className="text-sm">{t('search.tryDifferent', 'Try a different search term')}</p>
      </div>
    );
  }
  
  return (
    <div className="divide-y">
      {results.map((result) => {
        switch (type) {
          case 'conversations':
            return (
              <ConversationResult
                key={result.id}
                result={result}
                query={query}
                onSelect={onSelectConversation}
              />
            );
          case 'customers':
            return (
              <CustomerResult
                key={result.id}
                result={result}
                query={query}
                onSelect={onSelectCustomer}
              />
            );
          case 'messages':
            return (
              <MessageResult
                key={result.id}
                result={result}
                query={query}
                onSelect={onSelectConversation}
              />
            );
        }
      })}
      
      {/* Load More */}
      {hasNextPage && (
        <div className="p-4 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('search.loading', 'Loading...')}
              </>
            ) : (
              t('search.loadMore', 'Load more')
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

SearchResults.displayName = 'SearchResults';

import { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X, Mail, Users, MessageSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters } from '@/components/search/SearchFilters';
import { useGlobalSearch, useGlobalSearchCounts, type SearchFilters as SearchFiltersType } from '@/hooks/useGlobalSearch';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash.debounce';

const SearchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'conversations' | 'customers' | 'messages'>('conversations');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  
  // Debounce search query
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, 300),
    []
  );
  
  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSetQuery(value);
  };
  
  const { 
    data, 
    isLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage 
  } = useGlobalSearch({
    query: debouncedQuery,
    type: activeTab,
    filters,
    enabled: debouncedQuery.length >= 2
  });
  
  // Get counts for all tabs
  const { data: counts } = useGlobalSearchCounts({
    query: debouncedQuery,
    filters
  });
  
  // Get recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });
  
  // Save search to recent
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      const updated = [debouncedQuery, ...recentSearches.filter(s => s !== debouncedQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  }, [debouncedQuery]);
  
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  
  // Flatten paginated results
  const results = data?.pages.flatMap(page => page.results) || [];
  
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '' && v !== 'all');

  return (
    <UnifiedAppLayout>
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Search Header */}
        <div className="border-b bg-card px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">
              {t('search.title', 'Search')}
            </h1>
            
            {/* Large Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                id="global-search-input"
                placeholder={t('search.placeholder', 'Search conversations, customers, emails...')}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-12 pr-12 h-12 text-base bg-background"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setDebouncedQuery('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  {t('search.filters', 'Filters')}
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">
                      Active
                    </Badge>
                  )}
                </Button>
                
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({})}
                  >
                    {t('search.clearFilters', 'Clear filters')}
                  </Button>
                )}
              </div>
              
              <span className="text-sm text-muted-foreground">
                {t('search.shortcut', 'Press')} <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘K</kbd> {t('search.toSearch', 'to search')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 border-r bg-card p-4 overflow-y-auto">
              <SearchFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          )}
          
          {/* Results Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
              <div className="border-b px-6">
              <TabsList className="h-12 bg-transparent gap-4">
                  <TabsTrigger value="conversations" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <Mail className="w-4 h-4" />
                    {t('search.conversations', 'Conversations')}
                    {debouncedQuery.length >= 2 && counts?.conversations !== undefined && (
                      <Badge variant={activeTab === 'conversations' ? 'default' : 'secondary'}>
                        {counts.conversations}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <Users className="w-4 h-4" />
                    {t('search.customers', 'Customers')}
                    {debouncedQuery.length >= 2 && counts?.customers !== undefined && (
                      <Badge variant={activeTab === 'customers' ? 'default' : 'secondary'}>
                        {counts.customers}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <MessageSquare className="w-4 h-4" />
                    {t('search.messages', 'Messages')}
                    {debouncedQuery.length >= 2 && counts?.messages !== undefined && (
                      <Badge variant={activeTab === 'messages' ? 'default' : 'secondary'}>
                        {counts.messages}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {/* Empty State - No Query */}
                {debouncedQuery.length < 2 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Search className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg mb-2">{t('search.startSearching', 'Start searching')}</p>
                    <p className="text-sm">{t('search.minChars', 'Enter at least 2 characters to search')}</p>
                    
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="mt-8 w-full max-w-md">
                        <div className="flex items-center justify-between mb-2 px-4">
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {t('search.recentSearches', 'Recent Searches')}
                          </span>
                          <Button variant="ghost" size="sm" onClick={clearRecentSearches} className="text-xs h-6">
                            {t('search.clear', 'Clear')}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {recentSearches.map((search, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setQuery(search);
                                setDebouncedQuery(search);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-accent rounded-lg flex items-center gap-3 text-foreground"
                            >
                              <Search className="w-4 h-4 opacity-50" />
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Loading State */}
                {isLoading && debouncedQuery.length >= 2 && (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {/* Results */}
                {!isLoading && debouncedQuery.length >= 2 && (
                  <TabsContent value={activeTab} className="m-0 h-full">
                    <SearchResults
                      results={results}
                      type={activeTab}
                      query={debouncedQuery}
                      isLoading={isLoading}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      onLoadMore={fetchNextPage}
                      onSelectConversation={(id) => navigate(`/?conversation=${id}`)}
                      onSelectCustomer={(id) => navigate(`/?customer=${id}`)}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </UnifiedAppLayout>
  );
};

export default SearchPage;

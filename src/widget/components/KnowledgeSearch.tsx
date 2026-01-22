import React, { useState } from 'react';
import { searchFaq, SearchResult } from '../api';
import { getWidgetTranslations } from '../translations';

interface KnowledgeSearchProps {
  widgetKey: string;
  primaryColor: string;
  language: string;
}

export const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({
  widgetKey,
  primaryColor,
  language,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const t = getWidgetTranslations(language);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    const searchResults = await searchFaq(widgetKey, query.trim());
    setResults(searchResults);
    setIsSearching(false);
  };

  return (
    <div className="noddi-widget-search">
      <form onSubmit={handleSearch} className="noddi-widget-search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="noddi-widget-search-input"
          disabled={isSearching}
        />
        <button
          type="submit"
          className="noddi-widget-search-btn"
          style={{ backgroundColor: primaryColor }}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? (
            <svg className="noddi-widget-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          )}
        </button>
      </form>

      <div className="noddi-widget-results">
        {!hasSearched && (
          <div className="noddi-widget-results-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p>{t.searchKnowledgeBase}</p>
          </div>
        )}

        {hasSearched && results.length === 0 && !isSearching && (
          <div className="noddi-widget-results-empty">
            <p>{t.noResults} "{query}"</p>
            <span>{t.tryDifferentKeywords}</span>
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.id}
            className={`noddi-widget-result ${expandedId === result.id ? 'expanded' : ''}`}
            onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
          >
            <div className="noddi-widget-result-header">
              <span className="noddi-widget-result-question">{result.question}</span>
              <svg 
                className="noddi-widget-result-chevron" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {expandedId === result.id && (
              <div className="noddi-widget-result-answer">
                {result.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

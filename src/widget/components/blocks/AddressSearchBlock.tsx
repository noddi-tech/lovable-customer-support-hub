import React, { useState, useEffect, useRef, useCallback } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { searchAddressSuggestions, resolveAddress, type AddressSuggestion, type ResolvedAddress } from '../../api';

// ========== Component ==========

const AddressSearchBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, widgetKey, onLogEvent, data,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ResolvedAddress | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2 || !widgetKey) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddressSuggestions(widgetKey, query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, widgetKey]);

  const handleSelect = useCallback(async (suggestion: AddressSuggestion) => {
    setSelected(suggestion.description || suggestion.main_text || query);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setResolving(true);
    onLogEvent?.('address_selected', suggestion.description, 'info');

    if (!widgetKey) return;
    try {
      const address = await resolveAddress(widgetKey, suggestion.place_id);
      setResult(address);
      setResolving(false);

      const label = `${address.street_name} ${address.street_number || ''}, ${address.city}`.trim();
      const payload = JSON.stringify({
        address: label,
        is_in_delivery_area: address.is_in_delivery_area,
        zip_code: address.zip_code,
        city: address.city,
      });
      localStorage.setItem(`noddi_action_${blockKey}`, payload);
      onAction(payload, blockKey);
      onLogEvent?.(
        address.is_in_delivery_area ? 'delivery_area_confirmed' : 'delivery_area_denied',
        label,
        address.is_in_delivery_area ? 'success' : 'error',
      );
    } catch {
      setResolving(false);
      onLogEvent?.('address_resolve_error', '', 'error');
    }
  }, [widgetKey, blockKey, onAction, onLogEvent, query]);

  const handleClear = () => {
    setSelected(null);
    setResult(null);
    setQuery('');
    setSuggestions([]);
  };

  // ---- Submitted state ----
  if (submitted) {
    let parsed: any;
    try { parsed = JSON.parse(submitted); } catch { parsed = null; }
    const addr = parsed?.address || submitted;
    const inArea = parsed?.is_in_delivery_area;
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={inArea ? '#22c55e' : '#f59e0b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>{addr}{inArea === false ? ' (outside delivery area)' : ''}</span>
      </div>
    );
  }

  // ---- Result state ----
  if (result) {
    const label = `${result.street_name} ${result.street_number || ''}, ${result.city}`.trim();
    return (
      <div style={{ margin: '8px 0', padding: '10px 12px', borderRadius: '10px', fontSize: '13px',
        backgroundColor: result.is_in_delivery_area ? '#f0fdf4' : '#fffbeb',
        border: `1.5px solid ${result.is_in_delivery_area ? '#86efac' : '#fcd34d'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: result.is_in_delivery_area ? '#15803d' : '#92400e' }}>
          {result.is_in_delivery_area ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          )}
          {result.is_in_delivery_area ? 'We deliver here!' : "Sorry, we don't deliver here yet"}
        </div>
        <div style={{ marginTop: '4px', color: '#6b7280', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
          {label}
        </div>
      </div>
    );
  }

  // ---- Resolving state ----
  if (resolving) {
    return (
      <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
        <div style={{ width: 16, height: 16, border: '2px solid #d1d5db', borderTopColor: primaryColor, borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite' }} />
        Checking delivery area...
      </div>
    );
  }

  // ---- Search state ----
  return (
    <div ref={containerRef} style={{ margin: '8px 0', position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', border: '1.5px solid #d1d5db', borderRadius: '8px',
        padding: '0 10px', height: '36px', backgroundColor: '#fff', gap: '6px',
        ...(isOpen ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderColor: primaryColor } : {}),
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />
        </svg>
        {selected ? (
          <>
            <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected}</span>
            <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </>
        ) : (
          <input
            type="text"
            placeholder={data.placeholder || 'Search address...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', background: 'transparent', padding: 0 }}
          />
        )}
        {loading && (
          <div style={{ width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: primaryColor, borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite', flexShrink: 0 }} />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          border: `1.5px solid ${primaryColor}`, borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
          backgroundColor: '#fff', maxHeight: '200px', overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => {
            const main = s.main_text || s.description || '';
            const secondary = s.secondary_text || '';
            return (
              <button key={s.place_id || i} onClick={() => handleSelect(s)} style={{
                display: 'flex', flexDirection: 'column', width: '100%', padding: '8px 12px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontWeight: 500 }}>{main}</span>
                {secondary && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{secondary}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== Preview ==========

const AddressSearchPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex items-center border rounded-md px-2 py-1.5 text-[10px] bg-muted/30 gap-1.5">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60 shrink-0">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />
      </svg>
      <span className="text-muted-foreground/50 truncate">Search address...</span>
    </div>
  </div>
);

// ========== Registration ==========

registerBlock({
  type: 'address_search',
  marker: '[ADDRESS_SEARCH]',
  closingMarker: '[/ADDRESS_SEARCH]',
  parseContent: (inner) => ({ placeholder: inner.trim() || 'Search address...' }),
  component: AddressSearchBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [
      {
        name: 'Address Suggestions',
        edgeFunction: 'noddi-address-lookup',
        externalApi: 'GET /v1/addresses/suggestions/?input={input}',
        method: 'POST',
        requestBody: { action: 'suggestions', input: 'string' },
        responseShape: { suggestions: 'AddressSuggestion[]' },
        description: 'Search for address suggestions based on user input',
      },
      {
        name: 'Resolve Address',
        edgeFunction: 'noddi-address-lookup',
        externalApi: 'POST /v1/addresses/create-from-google-place-id/',
        method: 'POST',
        requestBody: { action: 'resolve', place_id: 'string' },
        responseShape: { address: 'ResolvedAddress' },
        description: 'Resolve a place_id to get full address with delivery area status',
      },
    ],
  },
  flowMeta: {
    label: 'Address Search',
    icon: '📍',
    description: 'Customer searches their address to check if Noddi delivers there.',
    applicableFieldTypes: ['address'],
    applicableNodeTypes: ['address_check'],
    previewComponent: AddressSearchPreview,
  },
});

export default AddressSearchBlock;

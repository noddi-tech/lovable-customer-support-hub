import React, { useState, useEffect } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

const SERVICE_ICONS: Record<string, string> = {
  dekkskift: '🔧', tyre_change: '🔧', dekk: '🔧',
  vask: '🚿', car_wash: '🚿', wash: '🚿',
  dekkhotell: '🏨', tyre_hotel: '🏨', storage: '🏨',
  polering: '✨', polish: '✨', detailing: '✨',
};

function getIcon(slug: string): string {
  const lower = slug.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🛠️';
}

const ServiceSelectBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, onLogEvent,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list_services' }),
        });
        const data = await resp.json();
        if (data.services) setServices(data.services);
        else setError('No services available');
      } catch { setError('Failed to load services'); }
      setLoading(false);
    })();
  }, []);

  const handleSelect = (service: any) => {
    const payload = JSON.stringify({
      type_slug: service.slug || service.type_slug,
      service_name: service.name || service.label,
    });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('service_selected', service.name || service.slug, 'success');
  };

  if (submitted) {
    let parsed: any;
    try { parsed = JSON.parse(submitted); } catch { parsed = null; }
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>{parsed?.service_name || submitted}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
        <div style={{ width: 16, height: 16, border: '2px solid #d1d5db', borderTopColor: primaryColor, borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite' }} />
        Loading services...
      </div>
    );
  }

  if (error) {
    return <div style={{ margin: '8px 0', color: '#ef4444', fontSize: '12px' }}>{error}</div>;
  }

  return (
    <div style={{ margin: '8px 0', display: 'grid', gap: '6px', gridTemplateColumns: services.length > 3 ? '1fr 1fr' : '1fr' }}>
      {services.map((s, i) => {
        const slug = s.slug || s.type_slug || '';
        const name = s.name || s.label || slug;
        return (
          <button
            key={slug || i}
            onClick={() => handleSelect(s)}
            disabled={isUsed}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', borderRadius: '10px', border: `1.5px solid #e5e7eb`,
              background: '#fff', cursor: isUsed ? 'default' : 'pointer',
              textAlign: 'left', fontSize: '13px', transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { if (!isUsed) (e.currentTarget as HTMLElement).style.borderColor = primaryColor; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
          >
            <span style={{ fontSize: '20px' }}>{getIcon(slug)}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{name}</div>
              {s.description && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.description}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
};

const ServiceSelectPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="grid grid-cols-2 gap-1">
      <div className="border rounded-md px-2 py-1.5 text-[9px] flex items-center gap-1">🔧 Dekkskift</div>
      <div className="border rounded-md px-2 py-1.5 text-[9px] flex items-center gap-1">🚿 Bilvask</div>
    </div>
  </div>
);

registerBlock({
  type: 'service_select',
  marker: '[SERVICE_SELECT]',
  closingMarker: '[/SERVICE_SELECT]',
  parseContent: () => ({}),
  component: ServiceSelectBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [{
      name: 'List Services',
      edgeFunction: 'noddi-booking-proxy',
      externalApi: 'GET /v1/booking-proposals/types/',
      method: 'POST',
      requestBody: { action: 'list_services' },
      responseShape: { services: '{ slug, name, description }[]' },
      description: 'Fetch available service types for booking',
    }],
  },
  flowMeta: {
    label: 'Service Selector',
    icon: '🛠️',
    description: 'Customer selects a service type (e.g., tire change, car wash).',
    applicableFieldTypes: ['service'],
    previewComponent: ServiceSelectPreview,
  },
});

export default ServiceSelectBlock;

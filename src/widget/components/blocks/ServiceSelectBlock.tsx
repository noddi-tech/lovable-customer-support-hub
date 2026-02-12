import React, { useState, useEffect } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

const CATEGORY_ICONS: Record<string, string> = {
  wheel_services: '🔧',
  stone_chip_repair: '🪨',
  car_wash: '🚿',
  tyre_hotel: '🏨',
  polering: '✨',
};

function getCategoryIcon(type: string): string {
  return CATEGORY_ICONS[type] || '🛠️';
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '';
  return price === 0 ? 'Gratis' : `${price.toLocaleString('nb-NO')} kr`;
}

interface SalesItem {
  id: number;
  name: string;
  short_description?: string;
  price?: number;
  category_type?: string;
  category_name?: string;
}

const ServiceSelectBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, onLogEvent, data,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const [items, setItems] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const addressId = data?.address_id ? Number(data.address_id) : null;
  const licensePlate: string | null = data?.license_plate || null;

  useEffect(() => {
    if (!addressId || !licensePlate) {
      setError(!addressId ? 'Missing address' : 'Missing license plate');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'available_items',
            address_id: addressId,
            license_plates: [licensePlate],
          }),
        });
        const respData = await resp.json();
        // Noddi returns array of category groups with nested sales_items
        const raw = Array.isArray(respData) ? respData : respData.results || [];
        const salesItems: SalesItem[] = [];
        for (const category of raw) {
          const catType = category.booking_category_type || category.type || '';
          const catName = category.booking_category_name || category.name || '';
          const categoryItems = category.sales_items || [];
          for (const item of categoryItems) {
            salesItems.push({
              id: item.id,
              name: item.name || '',
              short_description: item.short_description || '',
              price: item.unit_price != null ? item.unit_price : item.price,
              category_type: catType,
              category_name: catName,
            });
          }
        }
        if (salesItems.length > 0) setItems(salesItems);
        else setError('No services available for this location');
      } catch { setError('Failed to load services'); }
      setLoading(false);
    })();
  }, [addressId, licensePlate]);

  const handleSelect = (item: SalesItem) => {
    const payload = JSON.stringify({
      sales_item_id: item.id,
      service_name: item.name,
      price: item.price,
    });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('service_selected', item.name, 'success');
  };

  if (submitted) {
    let parsed: any;
    try { parsed = JSON.parse(submitted); } catch { parsed = null; }
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>
          {parsed?.service_name || submitted}
          {parsed?.price != null && ` — ${formatPrice(parsed.price)}`}
        </span>
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

  // Group items by category
  const grouped: Record<string, SalesItem[]> = {};
  for (const item of items) {
    const cat = item.category_name || 'Services';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return (
    <div style={{ margin: '8px 0' }}>
      {Object.entries(grouped).map(([catName, catItems]) => (
        <div key={catName} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{getCategoryIcon(catItems[0]?.category_type || '')}</span>
            {catName}
          </div>
          <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr' }}>
            {catItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                disabled={isUsed}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e5e7eb',
                  background: '#fff', cursor: isUsed ? 'default' : 'pointer',
                  textAlign: 'left', fontSize: '13px', transition: 'border-color 0.15s', width: '100%',
                }}
                onMouseEnter={(e) => { if (!isUsed) (e.currentTarget as HTMLElement).style.borderColor = primaryColor; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  {item.short_description && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.short_description}</div>}
                </div>
                {item.price != null && (
                  <div style={{ fontSize: '13px', fontWeight: 600, color: primaryColor, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {formatPrice(item.price)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ServiceSelectPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="text-[8px] font-semibold text-muted-foreground mb-1">🔧 Dekktjenester</div>
    <div className="grid gap-1">
      <div className="border rounded-md px-2 py-1.5 text-[9px] flex justify-between">
        <span>Dekkskift</span><span className="font-semibold">699 kr</span>
      </div>
      <div className="border rounded-md px-2 py-1.5 text-[9px] flex justify-between">
        <span>Dekkhotell ink. lagring</span><span className="font-semibold">1 999 kr</span>
      </div>
    </div>
  </div>
);

registerBlock({
  type: 'service_select',
  marker: '[SERVICE_SELECT]',
  closingMarker: '[/SERVICE_SELECT]',
  parseContent: (inner) => {
    try {
      const parsed = JSON.parse(inner.trim());
      return { address_id: parsed.address_id || '', license_plate: parsed.license_plate || '' };
    } catch {}
    const num = parseInt(inner.trim(), 10);
    return { address_id: isNaN(num) ? '' : num, license_plate: '' };
  },
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

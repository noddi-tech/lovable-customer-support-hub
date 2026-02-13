import React, { useState, useEffect } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids date shifts near midnight
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso.slice(11, 16);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Oslo',
    });
  } catch {
    return iso.slice(11, 16);
  }
}

const TimeSlotBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, onLogEvent, data,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const addressId = data.address_id ? Number(data.address_id) : null;
  const carIds: number[] = data.car_ids ? (Array.isArray(data.car_ids) ? data.car_ids.map(Number) : [Number(data.car_ids)]) : [];
  const licensePlate: string | null = data.license_plate || null;
  const salesItemId: number | null = data.sales_item_id ? Number(data.sales_item_id) : null;

  const [sortedDates, setSortedDates] = useState<string[]>([]);
  const [allWindows, setAllWindows] = useState<Record<string, any[]>>({});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!addressId) { setError('Missing address'); setLoading(false); return; }

    (async () => {
      try {
        const apiUrl = getApiUrl();
        const postJson = (body: any) => fetch(`${apiUrl}/noddi-booking-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then(r => r.json());

        // Resolve sales item IDs
        let salesItemIds: number[] = salesItemId ? [salesItemId] : [];
        let resolvedPlate = licensePlate;
        let resolvedCarIds = [...carIds];

        // Recovery: scan localStorage for license plate from earlier steps
        if (salesItemIds.length === 0 && !resolvedPlate && resolvedCarIds.length === 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith('noddi_action_')) continue;
            try {
              const stored = JSON.parse(localStorage.getItem(key) || '');
              if (stored.license_plate) {
                resolvedPlate = stored.license_plate;
                console.log('[TimeSlotBlock] Recovered license plate from localStorage:', resolvedPlate);
                break;
              }
              if (stored.car_ids?.length) {
                resolvedCarIds = stored.car_ids.map(Number);
                console.log('[TimeSlotBlock] Recovered car_ids from localStorage:', resolvedCarIds);
                break;
              }
            } catch { /* skip */ }
          }
        }

        if (salesItemIds.length === 0 && (resolvedPlate || resolvedCarIds.length > 0)) {
          const itemsPayload: any = {
            action: 'available_items',
            address_id: addressId,
          };
          if (resolvedPlate) {
            itemsPayload.license_plates = [resolvedPlate];
          } else if (resolvedCarIds.length > 0) {
            itemsPayload.car_ids = resolvedCarIds;
          }
          const itemsData = await postJson(itemsPayload);
          const cars = itemsData.cars || [];
          for (const car of cars) {
            for (const item of (car.sales_items || [])) {
              if (item.sales_item_id) salesItemIds.push(Number(item.sales_item_id));
            }
          }
        }

        if (salesItemIds.length === 0) {
          setError('Mangler kjøretøyinformasjon for å finne ledige tider. Prøv igjen.');
          setLoading(false);
          return;
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const fromDate = tomorrow.toISOString().slice(0, 10);
        const endD = new Date(tomorrow);
        endD.setDate(endD.getDate() + 14);
        const toDate = endD.toISOString().slice(0, 10);

        const payload: any = {
          action: 'delivery_windows',
          address_id: addressId,
          from_date: fromDate,
          to_date: toDate,
        };
        if (salesItemIds.length > 0) {
          payload.selected_sales_item_ids = salesItemIds;
        }
        const wData = await postJson(payload);

        const flatWindows: any[] = [];
        if (wData && typeof wData === 'object' && !Array.isArray(wData) && !wData.results && !wData.windows) {
          for (const [date, slots] of Object.entries(wData)) {
            if (date === 'error' || typeof slots !== 'object' || slots === null) continue;
            for (const [label, w] of Object.entries(slots as Record<string, any>)) {
              if (w && typeof w === 'object' && w.starts_at) {
                if (w.is_closed || w.is_capacity_full) continue;
                flatWindows.push({ ...w, date, label });
              }
            }
          }
        } else {
          const arr = Array.isArray(wData) ? wData : wData?.results || wData?.windows || [];
          for (const w of arr) {
            if (w.is_closed || w.is_capacity_full) continue;
            flatWindows.push(w);
          }
        }

        if (flatWindows.length > 0) {
          console.log('[TimeSlotBlock] Sample window object keys:', Object.keys(flatWindows[0]), flatWindows[0]);
        }

        const byDate: Record<string, any[]> = {};
        for (const w of flatWindows) {
          const wDate = w.date || (w.starts_at || '').slice(0, 10);
          if (!wDate) continue;
          if (!byDate[wDate]) byDate[wDate] = [];
          byDate[wDate].push(w);
        }
        const dates = Object.keys(byDate).sort();
        setSortedDates(dates);
        setAllWindows(byDate);
        setSelectedIdx(0);
      } catch {
        setError('Failed to load available times');
      }
      setLoading(false);
    })();
  }, [addressId]);

  const handleSlotSelect = (window: any) => {
    const currentDate = sortedDates[selectedIdx];
    const windowId = window.id || window.pk || window.delivery_window_id || window.delivery_window?.id;
    const payload = JSON.stringify({
      delivery_window_id: windowId,
      date: currentDate,
      start_time: window.start_time || window.starts_at,
      end_time: window.end_time || window.ends_at,
      price: window.price || window.total_price,
    });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('time_slot_selected', `${currentDate} ${formatTime(window.start_time || window.starts_at)}`, 'success');
  };

  if (submitted) {
    let parsed: any;
    try { parsed = JSON.parse(submitted); } catch { parsed = null; }
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>
          {parsed ? `${formatDate(parsed.date)} ${formatTime(parsed.start_time)}–${formatTime(parsed.end_time)}` : submitted}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
        <div style={{ width: 16, height: 16, border: '2px solid #d1d5db', borderTopColor: primaryColor, borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite' }} />
        Loading available times...
      </div>
    );
  }

  if (error) {
    return <div style={{ margin: '8px 0', color: '#ef4444', fontSize: '12px' }}>{error}</div>;
  }

  if (sortedDates.length === 0) {
    return <div style={{ margin: '8px 0', fontSize: '12px', color: '#9ca3af' }}>No available times in the next 2 weeks</div>;
  }

  const currentDate = sortedDates[selectedIdx];
  const windows = allWindows[currentDate] || [];

  return (
    <div style={{ margin: '8px 0' }}>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <button
          onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
          disabled={selectedIdx === 0 || isUsed}
          style={{
            background: 'none', border: 'none', cursor: selectedIdx === 0 || isUsed ? 'default' : 'pointer',
            padding: '2px 6px', fontSize: '16px', color: selectedIdx === 0 ? '#d1d5db' : primaryColor,
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
          {formatDate(currentDate)}
        </div>
        <button
          onClick={() => setSelectedIdx(i => Math.min(sortedDates.length - 1, i + 1))}
          disabled={selectedIdx === sortedDates.length - 1 || isUsed}
          style={{
            background: 'none', border: 'none', cursor: selectedIdx === sortedDates.length - 1 || isUsed ? 'default' : 'pointer',
            padding: '2px 6px', fontSize: '16px', color: selectedIdx === sortedDates.length - 1 ? '#d1d5db' : primaryColor,
          }}
        >
          ›
        </button>
      </div>
      <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr' }}>
        {windows.map((w, i) => {
          const start = formatTime(w.start_time || w.starts_at || '');
          const end = formatTime(w.end_time || w.ends_at || '');
          const price = w.price || w.total_price;
          return (
            <button
              key={w.id || w.pk || w.delivery_window_id || i}
              onClick={() => handleSlotSelect(w)}
              disabled={isUsed}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
                background: '#fff', cursor: isUsed ? 'default' : 'pointer',
                textAlign: 'left', fontSize: '12px', transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!isUsed) (e.currentTarget as HTMLElement).style.borderColor = primaryColor; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
            >
              <div style={{ fontWeight: 600 }}>{start}–{end}</div>
              {price !== undefined && <div style={{ color: '#6b7280', fontSize: '11px' }}>{price} kr</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TimeSlotPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[8px] text-muted-foreground">‹</span>
      <p className="text-[8px] font-semibold">Wed 12 Feb</p>
      <span className="text-[8px] text-muted-foreground">›</span>
    </div>
    <div className="grid grid-cols-2 gap-1">
      <div className="border rounded-md px-1.5 py-1 text-[8px]">08:00–12:00</div>
      <div className="border rounded-md px-1.5 py-1 text-[8px]">12:00–16:00</div>
    </div>
  </div>
);

registerBlock({
  type: 'time_slot',
  marker: '[TIME_SLOT]',
  closingMarker: '[/TIME_SLOT]',
  parseContent: (inner) => {
    try {
      const parsed = JSON.parse(inner.trim());
      return {
        address_id: parsed.address_id || '',
        car_ids: parsed.car_ids || parsed.cars || [],
        license_plate: parsed.license_plate || '',
        sales_item_id: parsed.sales_item_id || '',
      };
    } catch {}
    const parts = inner.trim().split('::');
    return {
      address_id: parts[0] || '',
      car_ids: [],
    };
  },
  component: TimeSlotBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [
      {
        name: 'Available Items',
        edgeFunction: 'noddi-booking-proxy',
        externalApi: 'POST /v1/sales-items/initial-available-for-booking/',
        method: 'POST',
        requestBody: { action: 'available_items', address_id: 'number', car_ids: 'number[]' },
        responseShape: { items: '{ id, name, price }[]' },
        description: 'Fetch available sales items for address and car',
      },
      {
        name: 'Delivery Windows',
        edgeFunction: 'noddi-booking-proxy',
        externalApi: 'GET /v1/delivery-windows/for-new-booking/',
        method: 'POST',
        requestBody: { action: 'delivery_windows', address_id: 'number', from_date: 'string', to_date: 'string', selected_sales_item_ids: 'number[]' },
        responseShape: { windows: '{ id, start_time, end_time, price }[]' },
        description: 'Get available time slots for a date range and address',
      },
    ],
  },
  flowMeta: {
    label: 'Time Slot Picker',
    icon: '📅',
    description: 'Customer selects a time slot with date navigation.',
    applicableFieldTypes: ['time_slot'],
    previewComponent: TimeSlotPreview,
  },
});

export default TimeSlotBlock;

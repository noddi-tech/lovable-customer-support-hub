import React, { useState, useEffect, useRef } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

const TimeSlotBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, onLogEvent, data,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const addressId = data.address_id;
  const proposalSlug = data.proposal_slug;

  const [dates, setDates] = useState<string[]>([]);
  const [windows, setWindows] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const dateScrollRef = useRef<HTMLDivElement>(null);

  // Load earliest date + initial windows
  useEffect(() => {
    if (!addressId) { setError('Missing address'); setLoading(false); return; }
    (async () => {
      try {
        // Get earliest date
        const edResp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'earliest_date', address_id: addressId }),
        });
        const edData = await edResp.json();
        const earliest = edData.earliest_date || edData.date || new Date().toISOString().slice(0, 10);

        // Generate 14 dates from earliest
        const dateList: string[] = [];
        const start = new Date(earliest + 'T00:00:00');
        for (let i = 0; i < 14; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          dateList.push(d.toISOString().slice(0, 10));
        }
        setDates(dateList);
        setSelectedDate(dateList[0]);
        await loadWindows(dateList[0]);
      } catch {
        setError('Failed to load dates');
      }
      setLoading(false);
    })();
  }, [addressId]);

  const loadWindows = async (date: string) => {
    setLoadingSlots(true);
    try {
      const resp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delivery_windows', address_id: addressId, from_date: date }),
      });
      const data = await resp.json();
      const allWindows = Array.isArray(data) ? data : data.results || data.windows || [];
      // Filter to selected date
      const filtered = allWindows.filter((w: any) => {
        const wDate = (w.start_time || w.starts_at || '').slice(0, 10);
        return wDate === date;
      });
      setWindows(filtered.length > 0 ? filtered : allWindows.slice(0, 8));
    } catch {
      setWindows([]);
    }
    setLoadingSlots(false);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    loadWindows(date);
  };

  const handleSlotSelect = (window: any) => {
    const payload = JSON.stringify({
      delivery_window_id: window.id,
      date: selectedDate,
      start_time: window.start_time || window.starts_at,
      end_time: window.end_time || window.ends_at,
      price: window.price || window.total_price,
    });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('time_slot_selected', `${selectedDate} ${formatTime(window.start_time || window.starts_at)}`, 'success');
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

  return (
    <div style={{ margin: '8px 0' }}>
      {/* Date chips */}
      <div ref={dateScrollRef} style={{
        display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {dates.map((d) => {
          const isSelected = d === selectedDate;
          const label = formatDate(d);
          return (
            <button
              key={d}
              onClick={() => handleDateSelect(d)}
              disabled={isUsed}
              style={{
                padding: '6px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600,
                whiteSpace: 'nowrap', border: '1.5px solid',
                borderColor: isSelected ? primaryColor : '#e5e7eb',
                background: isSelected ? primaryColor : '#fff',
                color: isSelected ? '#fff' : '#374151',
                cursor: isUsed ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {loadingSlots ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
          <div style={{ width: 14, height: 14, border: '2px solid #d1d5db', borderTopColor: primaryColor, borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite' }} />
          Loading slots...
        </div>
      ) : windows.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>No available slots for this date</div>
      ) : (
        <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr' }}>
          {windows.map((w, i) => {
            const start = formatTime(w.start_time || w.starts_at || '');
            const end = formatTime(w.end_time || w.ends_at || '');
            const price = w.price || w.total_price;
            return (
              <button
                key={w.id || i}
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
      )}
    </div>
  );
};

const TimeSlotPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex gap-1 mb-1">
      <div className="bg-primary/80 text-primary-foreground rounded-full px-2 py-0.5 text-[8px] font-semibold">Mon 12</div>
      <div className="border rounded-full px-2 py-0.5 text-[8px]">Tue 13</div>
      <div className="border rounded-full px-2 py-0.5 text-[8px]">Wed 14</div>
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
    // Parse "address_id::proposal_slug" from inner content
    const parts = inner.trim().split('::');
    return {
      address_id: parts[0] || '',
      proposal_slug: parts[1] || '',
    };
  },
  component: TimeSlotBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [
      {
        name: 'Earliest Date',
        edgeFunction: 'noddi-booking-proxy',
        externalApi: 'POST /v1/delivery-windows/earliest-date/',
        method: 'POST',
        requestBody: { action: 'earliest_date', address_id: 'number' },
        responseShape: { earliest_date: 'string (YYYY-MM-DD)' },
        description: 'Get earliest available booking date for an address',
      },
      {
        name: 'Delivery Windows',
        edgeFunction: 'noddi-booking-proxy',
        externalApi: 'GET /v1/delivery-windows/for-new-booking/',
        method: 'POST',
        requestBody: { action: 'delivery_windows', address_id: 'number', from_date: 'string' },
        responseShape: { windows: '{ id, start_time, end_time, price }[]' },
        description: 'Get available time slots for a date and address',
      },
    ],
  },
  flowMeta: {
    label: 'Time Slot Picker',
    icon: '📅',
    description: 'Customer selects a date and time slot for their booking.',
    applicableFieldTypes: ['time_slot'],
    previewComponent: TimeSlotPreview,
  },
});

export default TimeSlotBlock;

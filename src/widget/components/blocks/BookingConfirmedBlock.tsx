import React from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const BookingConfirmedBlock: React.FC<BlockComponentProps> = ({ data }) => {
  const rows: Array<{ label: string; value: string }> = [];
  if (data.service) rows.push({ label: '🛠️ Service', value: data.service });
  if (data.address) rows.push({ label: '📍 Address', value: data.address });
  if (data.car) rows.push({ label: '🚗 Car', value: data.car });
  if (data.date) rows.push({ label: '📅 Date', value: data.date });
  if (data.time) rows.push({ label: '🕐 Time', value: data.time });
  if (data.price) rows.push({ label: '💰 Price', value: data.price });

  const bookingLabel = data.booking_number || data.booking_id || '';

  return (
    <div style={{ margin: '8px 0', border: '1.5px solid #86efac', borderRadius: '12px', overflow: 'hidden', background: '#f0fdf4' }}>
      <div style={{
        padding: '10px 12px', background: '#dcfce7', borderBottom: '1px solid #86efac',
        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: '#15803d',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Booking confirmed!{bookingLabel ? ` #${bookingLabel}` : ''}
      </div>
      <div style={{ padding: '12px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '4px 0',
            fontSize: '13px', borderBottom: i < rows.length - 1 ? '1px solid #dcfce7' : 'none',
          }}>
            <span style={{ color: '#6b7280' }}>{r.label}</span>
            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BookingConfirmedPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-300 p-2">
    <p className="text-[9px] text-green-700 font-bold mb-1">✓ Booking confirmed! #B-12345</p>
    <div className="space-y-0.5 text-[8px]">
      <div className="flex justify-between"><span className="text-muted-foreground">🛠️ Service</span><span className="font-semibold">Dekkskift</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">📅 Date</span><span className="font-semibold">16. feb 2026</span></div>
    </div>
  </div>
);

registerBlock({
  type: 'booking_confirmed',
  marker: '[BOOKING_CONFIRMED]',
  closingMarker: '[/BOOKING_CONFIRMED]',
  parseContent: (inner) => {
    try {
      return JSON.parse(inner.trim());
    } catch {
      return { summary: inner.trim() };
    }
  },
  component: BookingConfirmedBlock,
  flowMeta: {
    label: 'Booking Confirmed',
    icon: '✅',
    description: 'Read-only success card showing confirmed booking details.',
    applicableFieldTypes: ['booking_confirmed'],
    previewComponent: BookingConfirmedPreview,
  },
});

export default BookingConfirmedBlock;

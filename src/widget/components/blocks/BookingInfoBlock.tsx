import React from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const BookingInfoBlock: React.FC<BlockComponentProps> = ({ data }) => {
  const rows: Array<{ label: string; value: string }> = [];
  if (data.address) rows.push({ label: '📍 Adresse', value: data.address });
  if (data.date) rows.push({ label: '📅 Dato', value: data.date });
  if (data.time || data.timeSlot) rows.push({ label: '🕐 Tid', value: data.time || data.timeSlot });
  if (data.service) rows.push({ label: '🛠️ Tjeneste', value: data.service });
  if (data.car || data.vehicle) rows.push({ label: '🚗 Bil', value: data.car || data.vehicle });
  if (data.price) rows.push({ label: '💰 Pris', value: data.price });

  const bookingLabel = data.booking_id || data.id || '';

  return (
    <div style={{ margin: '8px 0', border: '1.5px solid #93c5fd', borderRadius: '12px', overflow: 'hidden', background: '#eff6ff' }}>
      <div style={{
        padding: '10px 12px', background: '#dbeafe', borderBottom: '1px solid #93c5fd',
        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: '#1d4ed8',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Bestilling{bookingLabel ? ` #${bookingLabel}` : ''}
      </div>
      <div style={{ padding: '12px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '4px 0',
            fontSize: '13px', borderBottom: i < rows.length - 1 ? '1px solid #dbeafe' : 'none',
          }}>
            <span style={{ color: '#6b7280' }}>{r.label}</span>
            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>Ingen detaljer tilgjengelig.</div>
        )}
      </div>
    </div>
  );
};

const BookingInfoPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-300 p-2">
    <p className="text-[9px] text-blue-700 font-bold mb-1">📅 Bestilling #12345</p>
    <div className="space-y-0.5 text-[8px]">
      <div className="flex justify-between"><span className="text-muted-foreground">📍 Adresse</span><span className="font-semibold">Holtet 45, Oslo</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">🕐 Tid</span><span className="font-semibold">07:00–12:00</span></div>
    </div>
  </div>
);

registerBlock({
  type: 'booking_info',
  marker: '[BOOKING_INFO]',
  closingMarker: '[/BOOKING_INFO]',
  parseContent: (inner) => {
    try {
      return JSON.parse(inner.trim());
    } catch {
      return { summary: inner.trim() };
    }
  },
  component: BookingInfoBlock,
  flowMeta: {
    label: 'Booking Info',
    icon: '📋',
    description: 'Read-only card displaying current booking details (address, date, time, etc.).',
    applicableFieldTypes: ['booking_info'],
    previewComponent: BookingInfoPreview,
  },
});

export default BookingInfoBlock;

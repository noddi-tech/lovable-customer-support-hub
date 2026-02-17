import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

interface BookingOption {
  id: number | string;
  service: string;
  date: string;
  time: string;
  address: string;
  vehicle: string;
  license_plate: string;
}

const BookingCard: React.FC<{
  b: BookingOption;
  isSelected: boolean;
  isUsed: boolean;
  primaryColor: string;
  onToggle: (id: string | number) => void;
  fullWidth?: boolean;
}> = ({ b, isSelected, isUsed, primaryColor, onToggle, fullWidth }) => {
  const rows: Array<{ label: string; value: string }> = [];
  if (b.service) rows.push({ label: '🛠️ Tjeneste', value: b.service });
  if (b.address) rows.push({ label: '📍 Adresse', value: b.address });
  if (b.date) rows.push({ label: '📅 Dato', value: b.date });
  if (b.time) rows.push({ label: '🕐 Tid', value: b.time });
  if (b.vehicle) rows.push({ label: '🚗 Bil', value: b.vehicle });
  else if (b.license_plate) rows.push({ label: '🚗 Bil', value: b.license_plate });

  return (
    <div
      onClick={() => onToggle(b.id)}
      style={{
        width: fullWidth ? '100%' : undefined,
        border: isSelected ? `2.5px solid ${primaryColor}` : '1.5px solid #93c5fd',
        borderRadius: '12px',
        overflow: 'hidden',
        background: isSelected ? '#eff6ff' : '#f8fafc',
        cursor: isUsed ? 'default' : 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        opacity: isUsed && !isSelected ? 0.5 : 1,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        background: isSelected ? '#dbeafe' : '#e8eef4',
        borderBottom: `1px solid ${isSelected ? '#93c5fd' : '#cbd5e1'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#3b82f6' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#1d4ed8' : '#334155' }}>
            Bestilling{b.id ? ` #${b.id}` : ''}
          </span>
        </div>
        {/* Checkbox */}
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: isSelected ? `2px solid ${primaryColor}` : '2px solid #94a3b8',
          background: isSelected ? primaryColor : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '3px 0',
            fontSize: '12px',
            borderBottom: i < rows.length - 1 ? '1px solid #e2e8f0' : 'none',
          }}>
            <span style={{ color: '#6b7280' }}>{r.label}</span>
            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%', fontSize: '11px' }}>{r.value}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Ingen detaljer tilgjengelig.</div>
        )}
      </div>
    </div>
  );
};

const BookingSelectBlock: React.FC<BlockComponentProps> = ({ primaryColor, data, usedBlocks, onAction }) => {
  const bookings: BookingOption[] = data.bookings || [];
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const blockKey = `booking_select_${bookings.map(b => b.id).join('_')}`;
  const isUsed = usedBlocks.has(blockKey);

  const toggle = (id: string | number) => {
    if (isUsed) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0 || isUsed) return;
    const ids = Array.from(selected);
    onAction(JSON.stringify({ selected_ids: ids }), blockKey);
  };

  const renderCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {bookings.map((b) => (
        <BookingCard
          key={b.id}
          b={b}
          isSelected={selected.has(b.id)}
          isUsed={isUsed}
          primaryColor={primaryColor}
          onToggle={toggle}
          fullWidth
        />
      ))}
    </div>
  );

  return (
    <div style={{ margin: '8px 0' }}>
      {renderCards()}
      {/* Continue button */}
      {!isUsed && (
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: selected.size > 0 ? primaryColor : '#cbd5e1',
            color: selected.size > 0 ? 'white' : '#94a3b8',
            fontWeight: 600,
            fontSize: '14px',
            cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          Fortsett{selected.size > 0 ? ` (${selected.size} valgt)` : ''}
        </button>
      )}
    </div>
  );
};

const BookingSelectPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-300 p-2">
    <p className="text-[9px] text-blue-700 font-bold mb-1">📋 Velg bestilling(er)</p>
    <div className="flex gap-1">
      <div className="flex-1 rounded border border-blue-300 bg-white p-1 text-[7px]">
        <span className="font-bold">☑ Dekkskift #1</span>
      </div>
      <div className="flex-1 rounded border border-slate-300 bg-white p-1 text-[7px]">
        <span>☐ Vask #2</span>
      </div>
    </div>
  </div>
);

registerBlock({
  type: 'booking_select',
  marker: '[BOOKING_SELECT]',
  closingMarker: '[/BOOKING_SELECT]',
  parseContent: (inner) => {
    try {
      const parsed = JSON.parse(inner.trim());
      return { bookings: Array.isArray(parsed) ? parsed : [parsed] };
    } catch {
      return { bookings: [] };
    }
  },
  component: BookingSelectBlock,
  flowMeta: {
    label: 'Booking Select',
    icon: '📋',
    description: 'Multi-select carousel for choosing one or more bookings.',
    applicableFieldTypes: ['booking_select'],
    previewComponent: BookingSelectPreview,
  },
});

export default BookingSelectBlock;

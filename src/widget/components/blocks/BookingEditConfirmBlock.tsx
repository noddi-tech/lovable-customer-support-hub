import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

const BookingEditConfirmBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, onLogEvent, data,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    onLogEvent?.('booking_edit_confirm_started', '', 'info');

    try {
      const payload: any = {
        action: 'update_booking',
        booking_id: data.booking_id,
      };

      // Only include changed fields
      if (data.changes?.address_id) payload.address_id = data.changes.address_id;
      if (data.changes?.delivery_window_id) {
        payload.delivery_window_id = data.changes.delivery_window_id;
        payload.delivery_window_start = data.changes.delivery_window_start;
        payload.delivery_window_end = data.changes.delivery_window_end;

        // Recovery: if start/end missing, scan localStorage for TimeSlotBlock selection
        if (!payload.delivery_window_start || !payload.delivery_window_end) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith('noddi_action_')) continue;
            try {
              const val = JSON.parse(localStorage.getItem(key) || '');
              if (val.delivery_window_id === data.changes.delivery_window_id ||
                  val.delivery_window_id === Number(data.changes.delivery_window_id)) {
                if (!payload.delivery_window_start && val.start_time) {
                  payload.delivery_window_start = val.start_time;
                }
                if (!payload.delivery_window_end && val.end_time) {
                  payload.delivery_window_end = val.end_time;
                }
                break;
              }
            } catch { /* not relevant JSON */ }
          }
        }
      }
      if (data.changes?.cars) payload.cars = data.changes.cars;

      const resp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const respData = await resp.json();

      if (!resp.ok || respData.error) {
        if (resp.status >= 500) {
          setError('Booking update is temporarily unavailable, please try again later');
        } else {
          setError(respData.error || 'Failed to update booking');
        }
        setConfirming(false);
        return;
      }

      setResult(respData);
      const actionPayload = JSON.stringify({
        confirmed: true,
        booking_id: data.booking_id,
        updated: true,
      });
      localStorage.setItem(`noddi_action_${blockKey}`, actionPayload);
      onAction(actionPayload, blockKey);
      onLogEvent?.('booking_edit_confirmed', `#${data.booking_id}`, 'success');
    } catch {
      setError('Something went wrong, please try again later');
    }
    setConfirming(false);
  };

  const handleCancel = () => {
    const payload = JSON.stringify({ confirmed: false });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('booking_edit_cancelled', '', 'info');
  };

  // Submitted state
  if (submitted) {
    let parsed: any;
    try { parsed = JSON.parse(submitted); } catch { parsed = null; }
    if (parsed?.confirmed) {
      return (
        <div style={{ margin: '8px 0', padding: '12px', borderRadius: '12px', background: '#f0fdf4', border: '1.5px solid #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#15803d', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Booking updated!
          </div>
        </div>
      );
    }
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        <span style={{ fontSize: '12px' }}>Edit cancelled</span>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div style={{ margin: '8px 0', padding: '12px', borderRadius: '12px', background: '#f0fdf4', border: '1.5px solid #86efac' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#15803d', fontSize: '14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Booking updated!
        </div>
      </div>
    );
  }

  // Show changes summary
  const changes = data.changes || {};
  const rows: Array<{ label: string; old: string; new_val: string }> = [];
  if (changes.address) rows.push({ label: '📍 Address', old: changes.old_address || '—', new_val: changes.address });
  if (changes.time) rows.push({ label: '🕐 Time', old: changes.old_time || '—', new_val: changes.time });
  if (changes.date) rows.push({ label: '📅 Date', old: changes.old_date || '—', new_val: changes.date });
  if (changes.car) rows.push({ label: '🚗 Car', old: changes.old_car || '—', new_val: changes.car });
  if (changes.service) rows.push({ label: '🛠️ Service', old: changes.old_service || '—', new_val: changes.service });

  return (
    <div style={{ margin: '8px 0', border: '1.5px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fafafa' }}>
      <div style={{ padding: '10px 12px', background: '#f8f9fa', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: '13px' }}>
        ✏️ Confirm changes to booking #{data.booking_id}
      </div>
      <div style={{ padding: '12px' }}>
        {rows.length > 0 ? rows.map((r, i) => (
          <div key={i} style={{
            padding: '6px 0', fontSize: '13px',
            borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>{r.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '12px' }}>{r.old}</span>
              <span style={{ color: '#6b7280' }}>→</span>
              <span style={{ fontWeight: 600 }}>{r.new_val}</span>
            </div>
          </div>
        )) : (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>Review changes</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px' }}>
        <button
          onClick={handleConfirm}
          disabled={isUsed || confirming}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            border: 'none', background: primaryColor, color: '#fff',
            cursor: isUsed || confirming ? 'default' : 'pointer',
            opacity: confirming ? 0.7 : 1,
          }}
        >
          {confirming ? (
            <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          )}
          Confirm Changes
        </button>
        <button
          onClick={handleCancel}
          disabled={isUsed || confirming}
          style={{
            padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444',
            cursor: isUsed || confirming ? 'default' : 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
      {error && <div style={{ padding: '0 12px 12px', color: '#ef4444', fontSize: '12px' }}>{error}</div>}
    </div>
  );
};

const BookingEditPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="space-y-0.5 text-[8px] mb-1.5">
      <div className="flex justify-between"><span className="text-muted-foreground">🕐 Time</span><span><s className="text-muted-foreground">08:00</s> → <b>14:00</b></span></div>
    </div>
    <div className="flex gap-1">
      <div className="flex-1 bg-blue-500 text-white rounded-md py-0.5 text-center text-[8px] font-semibold">✓ Confirm</div>
      <div className="border border-red-400 text-red-500 rounded-md py-0.5 px-2 text-[8px] font-semibold">Cancel</div>
    </div>
  </div>
);

registerBlock({
  type: 'booking_edit',
  marker: '[BOOKING_EDIT]',
  closingMarker: '[/BOOKING_EDIT]',
  parseContent: (inner) => {
    try {
      return JSON.parse(inner.trim());
    } catch {
      return { summary: inner.trim() };
    }
  },
  component: BookingEditConfirmBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [
      {
        name: 'Update Booking',
        edgeFunction: 'noddi-booking-proxy',
        externalApi: 'PATCH /v1/bookings/{booking_id}/',
        method: 'POST',
        requestBody: { action: 'update_booking', booking_id: 'number' },
        responseShape: { booking: '{ id, status }' },
        description: 'Update an existing booking (change address, time, cars, or services)',
      },
    ],
  },
  flowMeta: {
    label: 'Booking Edit',
    icon: '✏️',
    description: 'Shows old vs new values for booking changes with confirm/cancel.',
    applicableFieldTypes: ['booking_edit'],
    previewComponent: BookingEditPreview,
  },
});

export default BookingEditConfirmBlock;

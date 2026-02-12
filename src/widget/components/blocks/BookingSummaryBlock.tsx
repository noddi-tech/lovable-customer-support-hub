import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

const BookingSummaryBlock: React.FC<BlockComponentProps> = ({
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
    onLogEvent?.('booking_confirm_started', '', 'info');

    try {
      // Create booking via Noddi API
      const bookingPayload: any = { action: 'create_booking' };
      if (data.address_id) bookingPayload.address_id = data.address_id;
      if (data.user_id) bookingPayload.user_id = data.user_id;
      if (data.user_group_id) bookingPayload.user_group_id = data.user_group_id;
      if (data.license_plate) bookingPayload.license_plate = data.license_plate;
      if (data.country_code) bookingPayload.country_code = data.country_code || 'NO';
      if (data.sales_item_ids) bookingPayload.sales_item_ids = data.sales_item_ids;
      if (data.delivery_window_id) bookingPayload.delivery_window_id = data.delivery_window_id;
      if (data.delivery_window_start) bookingPayload.delivery_window_start = data.delivery_window_start;
      if (data.delivery_window_end) bookingPayload.delivery_window_end = data.delivery_window_end;

      const resp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      const bookingData = await resp.json();
      if (!resp.ok || !bookingData.booking) {
        setError(bookingData.error || 'Failed to create booking');
        setConfirming(false);
        return;
      }

      const booking = bookingData.booking;

      setResult(booking);
      const payload = JSON.stringify({
        confirmed: true,
        booking_id: booking.id,
        booking_number: booking.booking_number || booking.id,
      });
      localStorage.setItem(`noddi_action_${blockKey}`, payload);
      onAction(payload, blockKey);
      onLogEvent?.('booking_confirmed', `#${booking.booking_number || booking.id}`, 'success');
    } catch {
      setError('Network error');
    }
    setConfirming(false);
  };

  const handleCancel = () => {
    const payload = JSON.stringify({ confirmed: false });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('booking_cancelled', '', 'info');
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
            Booking confirmed!
          </div>
          {parsed.booking_number && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
              Booking #{parsed.booking_number}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        <span style={{ fontSize: '12px' }}>Booking cancelled</span>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div style={{ margin: '8px 0', padding: '12px', borderRadius: '12px', background: '#f0fdf4', border: '1.5px solid #86efac' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#15803d', fontSize: '14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Booking confirmed!
        </div>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
          Booking #{result.booking_number || result.id}
        </div>
      </div>
    );
  }

  // Summary card
  const rows: Array<{ label: string; value: string }> = [];
  if (data.address) rows.push({ label: '📍 Address', value: data.address });
  if (data.car) rows.push({ label: '🚗 Car', value: data.car });
  if (data.service) rows.push({ label: '🛠️ Service', value: data.service });
  if (data.date) rows.push({ label: '📅 Date', value: data.date });
  if (data.time) rows.push({ label: '🕐 Time', value: data.time });
  if (data.price) rows.push({ label: '💰 Price', value: data.price });

  return (
    <div style={{ margin: '8px 0', border: '1.5px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fafafa' }}>
      {/* Summary rows */}
      <div style={{ padding: '12px' }}>
        {rows.length > 0 ? rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '4px 0',
            fontSize: '13px', borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span style={{ color: '#6b7280' }}>{r.label}</span>
            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
          </div>
        )) : (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>Review your booking details</div>
        )}
      </div>

      {/* Action buttons */}
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
          Confirm Booking
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

const BookingSummaryPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="space-y-0.5 text-[8px] mb-1.5">
      <div className="flex justify-between"><span className="text-muted-foreground">📍 Address</span><span className="font-semibold">Holtet 45</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">🚗 Car</span><span className="font-semibold">Tesla Model 3</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">🛠️ Service</span><span className="font-semibold">Dekkskift</span></div>
    </div>
    <div className="flex gap-1">
      <div className="flex-1 bg-green-500 text-white rounded-md py-0.5 text-center text-[8px] font-semibold">✓ Confirm</div>
      <div className="border border-red-400 text-red-500 rounded-md py-0.5 px-2 text-[8px] font-semibold">Cancel</div>
    </div>
  </div>
);

registerBlock({
  type: 'booking_summary',
  marker: '[BOOKING_SUMMARY]',
  closingMarker: '[/BOOKING_SUMMARY]',
  parseContent: (inner) => {
    // Parse JSON data from inner content
    try {
      return JSON.parse(inner.trim());
    } catch {
      return { summary: inner.trim() };
    }
  },
  component: BookingSummaryBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [
      {
        name: 'Create Booking (Shopping Cart)',
        edgeFunction: 'noddi-booking-proxy',
        externalApi: 'POST /v1/bookings/shopping-cart-for-new-booking/',
        method: 'POST',
        requestBody: { action: 'create_booking', address_id: 'number', car_id: 'number', sales_item_ids: 'number[]', delivery_window_id: 'number' },
        responseShape: { booking: '{ id, booking_number }' },
        description: 'Create and finalize the booking via shopping cart',
      },
    ],
  },
  flowMeta: {
    label: 'Booking Summary',
    icon: '📋',
    description: 'Shows booking summary with confirm/cancel. Creates the booking on confirm.',
    applicableFieldTypes: ['booking_summary'],
    previewComponent: BookingSummaryPreview,
  },
});

export default BookingSummaryBlock;

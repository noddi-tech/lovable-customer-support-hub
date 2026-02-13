import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { getApiUrl } from '../../api';

const COUNTRY_FLAGS: Record<string, string> = { NO: '🇳🇴', SE: '🇸🇪', DK: '🇩🇰', FI: '🇫🇮' };

interface StoredCar {
  id: number;
  make: string;
  model: string;
  plate: string;
}

const LicensePlateBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, onLogEvent, data,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const [plate, setPlate] = useState('');
  const [country, setCountry] = useState('NO');
  const [loading, setLoading] = useState(false);
  const [carInfo, setCarInfo] = useState<any>(null);
  const [error, setError] = useState('');

  const storedCars: StoredCar[] = data.stored || [];

  const handleSubmit = async () => {
    const cleaned = plate.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleaned) return;
    setLoading(true);
    setError('');
    onLogEvent?.('license_plate_lookup', cleaned, 'info');

    try {
      const resp = await fetch(`${getApiUrl()}/noddi-booking-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup_car', country_code: country, license_plate: cleaned }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.car) {
        if (resp.status >= 500) {
          setError('Vehicle lookup is temporarily unavailable, please try again later');
        } else {
          setError(result.error || 'Car not found');
        }
        setLoading(false);
        return;
      }
      const car = result.car;
      setCarInfo(car);
      const payload = JSON.stringify({
        car_id: car.id,
        make: car.make || car.brand,
        model: car.model,
        year: car.year,
        license_plate: cleaned,
      });
      localStorage.setItem(`noddi_action_${blockKey}`, payload);
      onAction(payload, blockKey);
      onLogEvent?.('license_plate_found', `${car.make || car.brand} ${car.model}`, 'success');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleStoredCarSelect = (car: StoredCar) => {
    setCarInfo({ id: car.id, make: car.make, model: car.model });
    setPlate(car.plate);
    const payload = JSON.stringify({
      car_id: car.id,
      make: car.make,
      model: car.model,
      license_plate: car.plate,
    });
    localStorage.setItem(`noddi_action_${blockKey}`, payload);
    onAction(payload, blockKey);
    onLogEvent?.('stored_car_selected', `${car.make} ${car.model}`, 'success');
  };

  // Submitted state
  if (submitted) {
    let parsed: any;
    try { parsed = JSON.parse(submitted); } catch { parsed = null; }
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>
          {parsed ? `${parsed.make} ${parsed.model} (${parsed.license_plate})` : submitted}
        </span>
      </div>
    );
  }

  // Car found state
  if (carInfo) {
    return (
      <div style={{ margin: '8px 0', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', backgroundColor: '#f0fdf4', border: '1.5px solid #86efac' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#15803d' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {carInfo.make || carInfo.brand} {carInfo.model} {carInfo.year ? `(${carInfo.year})` : ''}
        </div>
        <div style={{ marginTop: '4px', color: '#6b7280', fontSize: '12px' }}>
          🚗 {plate.toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '8px 0' }}>
      {/* Stored car quick-select pills */}
      {storedCars.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            Dine lagrede biler:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {storedCars.map((car) => (
              <button
                key={car.id}
                onClick={() => handleStoredCarSelect(car)}
                disabled={isUsed || loading}
                style={{
                  padding: '5px 10px', borderRadius: '16px',
                  border: '1.5px solid #e5e7eb', background: '#f9fafb',
                  fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primaryColor; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
              >
                <span>🚗</span> {car.make} {car.model} ({car.plate})
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
        {/* Country selector */}
        <button
          onClick={() => setCountry(c => c === 'NO' ? 'SE' : 'NO')}
          disabled={isUsed || loading}
          style={{
            padding: '0 8px', borderRadius: '8px', border: '1.5px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '2px',
          }}
        >
          {COUNTRY_FLAGS[country] || '🏳️'} <span style={{ fontSize: '10px', color: '#6b7280' }}>{country}</span>
        </button>

        {/* Plate input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', border: '1.5px solid #d1d5db',
          borderRadius: '8px', padding: '0 10px', height: '36px', backgroundColor: '#fff',
        }}>
          <input
            type="text"
            placeholder={data.placeholder || 'AB 12345'}
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={isUsed || loading}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '1px', background: 'transparent', textTransform: 'uppercase' }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isUsed || loading || !plate.trim()}
          style={{
            padding: '0 14px', borderRadius: '8px', border: 'none',
            background: primaryColor, color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: loading || !plate.trim() ? 'default' : 'pointer',
            opacity: loading || !plate.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          {loading ? (
            <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'noddi-spin 0.6s linear infinite' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          )}
        </button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

const LicensePlatePreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex items-center gap-1.5">
      <div className="border rounded-md px-1.5 py-1 text-[10px]">🇳🇴 NO</div>
      <div className="flex-1 border rounded-md px-2 py-1 text-[10px] text-muted-foreground/50 font-mono tracking-wider">AB 12345</div>
      <div className="bg-primary/80 text-primary-foreground rounded-md px-2 py-1 text-[9px] font-semibold">🔍</div>
    </div>
  </div>
);

registerBlock({
  type: 'license_plate',
  marker: '[LICENSE_PLATE]',
  closingMarker: '[/LICENSE_PLATE]',
  parseContent: (inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return { placeholder: 'AB 12345', stored: [] };
    try {
      const parsed = JSON.parse(trimmed);
      return { placeholder: 'AB 12345', stored: parsed.stored || [] };
    } catch {
      return { placeholder: 'AB 12345', stored: [] };
    }
  },
  component: LicensePlateBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [{
      name: 'Car Lookup',
      edgeFunction: 'noddi-booking-proxy',
      externalApi: 'GET /v1/cars/data-from-license-plate-number/',
      method: 'POST',
      requestBody: { action: 'lookup_car', country_code: 'string', license_plate: 'string' },
      responseShape: { car: '{ id, make, model, year }' },
      description: 'Look up car details from a license plate number',
    }],
  },
  flowMeta: {
    label: 'License Plate Input',
    icon: '🚗',
    description: 'Customer enters their license plate to look up their car.',
    applicableFieldTypes: ['license_plate'],
    previewComponent: LicensePlatePreview,
  },
});

export default LicensePlateBlock;

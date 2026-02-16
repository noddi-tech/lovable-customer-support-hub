import React, { useState } from 'react';
import { BlockComponentProps, registerBlock } from './registry';

interface GroupOption {
  id: number;
  name: string;
  is_personal?: boolean;
  is_default?: boolean;
  total_bookings?: number;
}

const GroupSelectBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, data,
}) => {
  const blockKey = `group_select_${messageId}_${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const groups: GroupOption[] = data?.groups || [];

  const [selected, setSelected] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Recover persisted selection
  const storedValue = (() => {
    try {
      const raw = localStorage.getItem(`noddi_action_${blockKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed;
      }
    } catch { /* ignore */ }
    return null;
  })();

  const selectedName = storedValue?.name
    || groups.find(g => String(g.id) === selected)?.name
    || '';

  if (groups.length === 0) return null;

  const showConfirmed = isUsed || confirmed;

  if (showConfirmed && selectedName) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>
          {selectedName}
        </span>
      </div>
    );
  }

  const chevronSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
  );

  const handleConfirm = () => {
    if (!selected) return;
    const group = groups.find(g => String(g.id) === selected);
    if (!group) return;
    setConfirmed(true);
    const payload = JSON.stringify({ user_group_id: group.id, name: group.name, action: 'group_selected' });
    onAction(payload, blockKey);
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={isUsed}
        style={{
          width: '100%',
          padding: '10px 36px 10px 12px',
          borderRadius: '8px',
          border: `1.5px solid ${primaryColor}`,
          fontSize: '14px',
          background: '#fff',
          color: selected ? '#1a1a1a' : '#999',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,${chevronSvg}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          backgroundSize: '16px',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      >
        <option value="" disabled>Velg gruppe...</option>
        {groups.map(g => (
          <option key={g.id} value={String(g.id)}>
            {g.name}{g.is_personal ? ' (Personlig)' : ''}
          </option>
        ))}
      </select>

      {selected && !showConfirmed && (
        <button
          onClick={handleConfirm}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: primaryColor,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Bekreft
        </button>
      )}
    </div>
  );
};

registerBlock({
  type: 'group_select',
  marker: '[GROUP_SELECT]',
  closingMarker: '[/GROUP_SELECT]',
  parseContent: (inner) => {
    try { return JSON.parse(inner.trim()); }
    catch { return { groups: [] }; }
  },
  component: GroupSelectBlock,
  flowMeta: {
    label: 'Group Select',
    icon: '👥',
    description: 'Dropdown to choose which user group to manage.',
  },
});

export default GroupSelectBlock;

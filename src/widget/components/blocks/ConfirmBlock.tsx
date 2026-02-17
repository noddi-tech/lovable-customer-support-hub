import React from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const ConfirmBlock: React.FC<BlockComponentProps> = ({
  messageId, blockIndex, usedBlocks, onAction, data,
}) => {
  const summary: string = data.summary || '';
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selected = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const handleSelect = (choice: string) => {
    localStorage.setItem(`noddi_action_${blockKey}`, choice);
    onAction(choice, blockKey);
  };

  return (
    <div style={{ margin: '10px 0', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '14px', background: '#fafafa' }}>
      <p style={{ fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>{summary}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button disabled={isUsed} onClick={() => handleSelect('Confirmed')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #22c55e',
            background: selected === 'Confirmed' ? '#22c55e' : 'transparent',
            color: selected === 'Confirmed' ? '#fff' : '#22c55e',
            opacity: isUsed && selected !== 'Confirmed' ? 0.4 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Bekreft
        </button>
        <button disabled={isUsed} onClick={() => handleSelect('Cancelled')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #ef4444',
            background: selected === 'Cancelled' ? '#ef4444' : 'transparent',
            color: selected === 'Cancelled' ? '#fff' : '#ef4444',
            opacity: isUsed && selected !== 'Cancelled' ? 0.4 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Avbryt
        </button>
      </div>
    </div>
  );
};

const ConfirmPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex gap-1.5">
      <div className="flex-1 flex items-center justify-center gap-1 border-2 border-green-400 rounded-lg py-1 text-green-600 text-[9px] font-semibold">✓ Bekreft</div>
      <div className="flex-1 flex items-center justify-center gap-1 border-2 border-red-400 rounded-lg py-1 text-red-600 text-[9px] font-semibold">✕ Avbryt</div>
    </div>
  </div>
);

registerBlock({
  type: 'confirm',
  marker: '[CONFIRM]',
  closingMarker: '[/CONFIRM]',
  parseContent: (inner) => {
    // Strip any nested marker tags (e.g. [YES_NO]...[/YES_NO])
    const cleaned = inner.replace(/\[[A-Z_]+\]([\s\S]*?)\[\/[A-Z_]+\]/g, '$1').trim();
    return { summary: cleaned };
  },
  component: ConfirmBlock,
  flowMeta: {
    label: 'Confirmation Card',
    icon: '✅',
    description: 'The customer will see a confirmation card with Confirm and Cancel buttons.',
    previewComponent: ConfirmPreview,
  },
});

export default ConfirmBlock;

import React from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const YesNoBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, data,
}) => {
  const question: string = data.question || '';
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selected = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  const handleSelect = (choice: string) => {
    localStorage.setItem(`noddi_action_${blockKey}`, choice);
    onAction(choice, blockKey);
  };

  return (
    <div style={{ margin: '10px 0' }}>
      {question && <p style={{ fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>{question}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button disabled={isUsed} onClick={() => handleSelect('Yes')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #22c55e',
            background: selected === 'Yes' ? '#22c55e' : 'transparent',
            color: selected === 'Yes' ? '#fff' : '#22c55e',
            opacity: isUsed && selected !== 'Yes' ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M4 22H2V11h2"/></svg>
          Yes
        </button>
        <button disabled={isUsed} onClick={() => handleSelect('No')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #ef4444',
            background: selected === 'No' ? '#ef4444' : 'transparent',
            color: selected === 'No' ? '#fff' : '#ef4444',
            opacity: isUsed && selected !== 'No' ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M20 2h2v11h-2"/></svg>
          No
        </button>
      </div>
    </div>
  );
};

const YesNoPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1.5">Customer sees:</p>
    <div className="flex gap-1.5">
      <div className="flex-1 flex items-center justify-center gap-1 border-2 border-green-400 rounded-lg py-1.5 text-green-600 text-[10px] font-semibold">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M4 22H2V11h2"/></svg>
        Yes
      </div>
      <div className="flex-1 flex items-center justify-center gap-1 border-2 border-red-400 rounded-lg py-1.5 text-red-600 text-[10px] font-semibold">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M20 2h2v11h-2"/></svg>
        No
      </div>
    </div>
  </div>
);

registerBlock({
  type: 'yes_no',
  marker: '[YES_NO]',
  closingMarker: '[/YES_NO]',
  parseContent: (inner) => ({ question: inner.trim() }),
  component: YesNoBlock,
  flowMeta: {
    label: 'YES / NO Buttons',
    icon: '👍',
    description: 'The customer will see two buttons with thumbs up (YES) and thumbs down (NO) icons.',
    applicableNodeTypes: ['decision'],
    previewComponent: YesNoPreview,
  },
});

export default YesNoBlock;

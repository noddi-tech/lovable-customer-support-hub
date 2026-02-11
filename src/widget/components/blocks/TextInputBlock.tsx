import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const TextInputBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, data,
}) => {
  const placeholder: string = data.placeholder || 'Type here...';
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const [value, setValue] = useState('');
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  if (submitted) {
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>{submitted}</span>
      </div>
    );
  }

  const handleSubmit = () => {
    if (value.trim()) {
      localStorage.setItem(`noddi_action_${blockKey}`, value.trim());
      onAction(value.trim(), blockKey);
    }
  };

  return (
    <div style={{ margin: '8px 0', display: 'flex', gap: '6px' }}>
      <input type="text" placeholder={placeholder} value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) handleSubmit(); }}
        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13px', outline: 'none' }}
      />
      <button onClick={handleSubmit} disabled={!value.trim()}
        style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: value.trim() ? 'pointer' : 'default', opacity: value.trim() ? 1 : 0.5 }}
      >→</button>
    </div>
  );
};

const TextInputPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex items-center gap-1.5">
      <div className="flex items-center border rounded-md px-2 py-1 text-[10px] bg-muted/30 flex-1">
        <span className="text-muted-foreground/50">Type here...</span>
      </div>
      <div className="h-6 w-6 rounded-md bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">→</div>
    </div>
  </div>
);

registerBlock({
  type: 'text_input',
  marker: '[TEXT_INPUT]',
  closingMarker: '[/TEXT_INPUT]',
  parseContent: (inner) => ({ placeholder: inner.trim() }),
  component: TextInputBlock,
  flowMeta: {
    label: 'Text Input',
    icon: '📝',
    description: 'The customer will see a text input field with a submit button.',
    applicableFieldTypes: ['text'],
    previewComponent: TextInputPreview,
  },
});

export default TextInputBlock;

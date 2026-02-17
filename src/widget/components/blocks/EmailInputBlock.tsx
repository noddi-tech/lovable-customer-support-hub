import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const EmailInputBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
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
    const trimmed = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Vennligst skriv inn en gyldig e-postadresse');
      return;
    }
    setError('');
    localStorage.setItem(`noddi_action_${blockKey}`, trimmed);
    onAction(trimmed, blockKey);
  };

  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <input
            type="email" placeholder="your@email.com" value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13px', outline: 'none' }}
          />
        </div>
        <button onClick={handleSubmit} disabled={!value.trim()}
          style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: value.trim() ? 'pointer' : 'default', opacity: value.trim() ? 1 : 0.5 }}
        >→</button>
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
};

const EmailInputPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 border rounded-md px-2 py-1 text-[10px] bg-muted/30 flex-1">
        <span className="text-muted-foreground/50">✉</span>
        <span className="text-muted-foreground/50">your@email.com</span>
      </div>
      <div className="h-6 w-6 rounded-md bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">→</div>
    </div>
  </div>
);

registerBlock({
  type: 'email_input',
  marker: '[EMAIL_INPUT]',
  parseContent: () => ({}),
  component: EmailInputBlock,
  flowMeta: {
    label: 'Email Input',
    icon: '✉️',
    description: 'The customer will see an email input field with validation.',
    applicableFieldTypes: ['email'],
    previewComponent: EmailInputPreview,
  },
});

export default EmailInputBlock;

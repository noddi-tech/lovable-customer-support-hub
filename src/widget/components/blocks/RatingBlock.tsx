import React, { useState } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';

const RatingBlock: React.FC<BlockComponentProps> = ({
  messageId, blockIndex, usedBlocks, onAction,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selected = isUsed ? parseInt(localStorage.getItem(`noddi_action_${blockKey}`) || '0') : 0;
  const [hover, setHover] = useState(0);

  return (
    <div style={{ margin: '10px 0', display: 'flex', gap: '4px', alignItems: 'center' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star} disabled={isUsed}
          onMouseEnter={() => !isUsed && setHover(star)}
          onClick={() => {
            const num = String(star);
            localStorage.setItem(`noddi_action_${blockKey}`, num);
            onAction(`Rating: ${star}/5`, blockKey);
          }}
          style={{ background: 'none', border: 'none', cursor: isUsed ? 'default' : 'pointer', padding: '2px', transition: 'transform 0.1s', transform: (!isUsed && hover === star) ? 'scale(1.2)' : 'scale(1)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={(hover || selected) >= star ? '#facc15' : 'none'} stroke={(hover || selected) >= star ? '#facc15' : '#d1d5db'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
      {selected > 0 && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>{selected}/5</span>}
    </div>
  );
};

const RatingPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2">
    <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i <= 3 ? '#facc15' : 'none'} stroke={i <= 3 ? '#facc15' : '#d1d5db'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      ))}
    </div>
  </div>
);

registerBlock({
  type: 'rating',
  marker: '[RATING]',
  parseContent: () => ({}),
  component: RatingBlock,
  flowMeta: {
    label: 'Star Rating',
    icon: '⭐',
    description: 'The customer will see a 5-star rating selector.',
    previewComponent: RatingPreview,
  },
});

export default RatingBlock;

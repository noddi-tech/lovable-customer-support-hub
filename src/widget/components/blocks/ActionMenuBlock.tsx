import React from 'react';
import { registerBlock, BlockComponentProps } from './registry';

const ActionMenuBlock: React.FC<BlockComponentProps> = ({
  primaryColor, messageId, blockIndex, usedBlocks, onAction, data,
}) => {
  const options: string[] = data.options || [];
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selectedOption = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  return (
    <div className="noddi-action-menu" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
      {options.map((option, i) => {
        const isSelected = selectedOption === option;
        return (
          <button
            key={i}
            className="noddi-action-pill"
            disabled={isUsed}
            onClick={() => {
              localStorage.setItem(`noddi_action_${blockKey}`, option);
              onAction(option, blockKey);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '18px',
              border: `1.5px solid ${primaryColor}`,
              background: isSelected ? primaryColor : 'transparent',
              color: isSelected ? '#fff' : primaryColor,
              fontSize: '13px',
              fontWeight: 500,
              cursor: isUsed ? 'default' : 'pointer',
              opacity: isUsed && !isSelected ? 0.45 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

const ActionMenuPreview: React.FC = () => (
  <div className="flex flex-wrap gap-1">
    {['Option 1', 'Option 2'].map((o, i) => (
      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full border border-purple-400 text-purple-600">{o}</span>
    ))}
  </div>
);

registerBlock({
  type: 'action_menu',
  marker: '[ACTION_MENU]',
  closingMarker: '[/ACTION_MENU]',
  parseContent: (inner) => {
    const options = inner.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return { options };
  },
  component: ActionMenuBlock,
  flowMeta: {
    label: 'Action Menu',
    icon: '📋',
    description: 'Presents clickable pill buttons for the customer to choose from.',
    previewComponent: ActionMenuPreview,
  },
});

export default ActionMenuBlock;

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  Image, 
  MousePointer2, 
  Minus, 
  Space, 
  Columns3, 
  Share2, 
  Package, 
  Ticket,
  Code
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NewsletterBlock } from '../NewsletterBuilder';

interface BlocksPaletteProps {
  onAddBlock: (blockType: NewsletterBlock['type']) => void;
}

export const BlocksPalette: React.FC<BlocksPaletteProps> = ({ onAddBlock }) => {
  const { t } = useTranslation();

  const blocks = [
    { type: 'text' as const, icon: Type, label: t('text') },
    { type: 'image' as const, icon: Image, label: t('image') },
    { type: 'button' as const, icon: MousePointer2, label: t('button') },
    { type: 'divider' as const, icon: Minus, label: t('divider') },
    { type: 'spacer' as const, icon: Space, label: t('spacer') },
    { type: 'columns' as const, icon: Columns3, label: t('columns') },
    { type: 'social' as const, icon: Share2, label: t('socialIcons') },
    { type: 'product' as const, icon: Package, label: t('productCard') },
    { type: 'ticket' as const, icon: Ticket, label: t('serviceTicket') },
    { type: 'html' as const, icon: Code, label: t('customHTML') }
  ];

  return (
    <div className="pane">
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground mb-4">{t('dragBlocks')}</h3>
        {blocks.map((block) => {
          const Icon = block.icon;
          return (
            <Button
              key={block.type}
              variant="ghost"
              className="w-full justify-start h-auto p-3 flex flex-col items-center gap-2 text-xs"
              onClick={() => onAddBlock(block.type)}
            >
              <Icon className="h-6 w-6" />
              <span>{block.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
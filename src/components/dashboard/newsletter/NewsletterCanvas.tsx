import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NewsletterBlock } from '../NewsletterBuilder';
import { SortableNewsletterBlock } from './SortableNewsletterBlock';
import { cn } from '@/lib/utils';

interface NewsletterCanvasProps {
  blocks: NewsletterBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  previewDevice: 'desktop' | 'mobile';
  isDarkMode: boolean;
  globalStyles: any;
}

export const NewsletterCanvas: React.FC<NewsletterCanvasProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  previewDevice,
  isDarkMode,
  globalStyles
}) => {
  const canvasMaxWidth = previewDevice === 'mobile' ? '375px' : globalStyles.maxWidth || '600px';

  return (
    <ScrollArea className="flex-1">
      <div className="p-8 min-h-full bg-muted/20">
        <div className="mx-auto" style={{ maxWidth: canvasMaxWidth }}>
          <div
            className={cn(
              "bg-background border rounded-lg shadow-sm min-h-96",
              isDarkMode && "bg-gray-900 text-white"
            )}
            style={{
              backgroundColor: isDarkMode ? '#1a1a1a' : globalStyles.backgroundColor,
              fontFamily: globalStyles.fontFamily,
              fontSize: globalStyles.fontSize
            }}
          >
            {blocks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-lg mb-2">Start building your newsletter</p>
                <p className="text-sm">Drag blocks from the left sidebar to begin</p>
              </div>
            ) : (
              <div className="p-4">
                {blocks.map((block, index) => (
                  <SortableNewsletterBlock
                    key={block.id}
                    block={block}
                    index={index}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => onSelectBlock(block.id)}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
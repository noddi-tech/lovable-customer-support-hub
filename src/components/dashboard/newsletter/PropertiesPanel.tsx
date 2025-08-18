import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useNewsletterStore } from './useNewsletterStore';

interface PropertiesPanelProps {
  selectedBlockId: string | null;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedBlockId }) => {
  const { t } = useTranslation();
  const { blocks, updateBlock } = useNewsletterStore();
  
  const selectedBlock = blocks.find(block => block.id === selectedBlockId);

  const updateBlockContent = (field: string, value: any) => {
    if (selectedBlock) {
      updateBlock(selectedBlock.id, {
        content: { ...selectedBlock.content, [field]: value }
      });
    }
  };

  const updateBlockStyles = (field: string, value: any) => {
    if (selectedBlock) {
      updateBlock(selectedBlock.id, {
        styles: { ...selectedBlock.styles, [field]: value }
      });
    }
  };

  if (!selectedBlock) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>{t('selectBlockToEdit')}</p>
      </div>
    );
  }

  const renderBlockProperties = () => {
    switch (selectedBlock.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">{t('content')}</Label>
              <Textarea
                id="text-content"
                value={selectedBlock.content.text}
                onChange={(e) => updateBlockContent('text', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="text-tag">{t('htmlTag')}</Label>
              <Select 
                value={selectedBlock.content.tag} 
                onValueChange={(value) => updateBlockContent('tag', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="p">Paragraph</SelectItem>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="h3">Heading 3</SelectItem>
                  <SelectItem value="h4">Heading 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-src">{t('imageUrl')}</Label>
              <Input
                id="image-src"
                value={selectedBlock.content.src}
                onChange={(e) => updateBlockContent('src', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="image-alt">{t('altText')}</Label>
              <Input
                id="image-alt"
                value={selectedBlock.content.alt}
                onChange={(e) => updateBlockContent('alt', e.target.value)}
                placeholder="Image description"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="image-width">{t('width')}</Label>
                <Input
                  id="image-width"
                  value={selectedBlock.content.width}
                  onChange={(e) => updateBlockContent('width', e.target.value)}
                  placeholder="100%"
                />
              </div>
              <div>
                <Label htmlFor="image-height">{t('height')}</Label>
                <Input
                  id="image-height"
                  value={selectedBlock.content.height}
                  onChange={(e) => updateBlockContent('height', e.target.value)}
                  placeholder="auto"
                />
              </div>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="button-text">{t('buttonText')}</Label>
              <Input
                id="button-text"
                value={selectedBlock.content.text}
                onChange={(e) => updateBlockContent('text', e.target.value)}
                placeholder="Click Here"
              />
            </div>
            <div>
              <Label htmlFor="button-href">{t('link')}</Label>
              <Input
                id="button-href"
                value={selectedBlock.content.href}
                onChange={(e) => updateBlockContent('href', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="button-target">{t('target')}</Label>
              <Select 
                value={selectedBlock.content.target} 
                onValueChange={(value) => updateBlockContent('target', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_blank">New Window</SelectItem>
                  <SelectItem value="_self">Same Window</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="spacer-height">{t('height')}</Label>
              <Input
                id="spacer-height"
                value={selectedBlock.content.height}
                onChange={(e) => updateBlockContent('height', e.target.value)}
                placeholder="24px"
              />
            </div>
          </div>
        );

      case 'html':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="html-content">{t('htmlContent')}</Label>
              <Textarea
                id="html-content"
                value={selectedBlock.content.html}
                onChange={(e) => updateBlockContent('html', e.target.value)}
                rows={6}
                placeholder="<p>Your HTML content here</p>"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground text-sm">
            <p>{t('propertiesNotAvailable')}</p>
          </div>
        );
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="font-medium mb-2">{t('blockProperties')}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {selectedBlock.type} {t('block')}
          </p>
        </div>

        <Separator />

        {renderBlockProperties()}

        <Separator />

        {/* Style Properties */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('styling')}</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="margin">{t('margin')}</Label>
              <Input
                id="margin"
                value={selectedBlock.styles.margin || '0'}
                onChange={(e) => updateBlockStyles('margin', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="padding">{t('padding')}</Label>
              <Input
                id="padding"
                value={selectedBlock.styles.padding || '16px'}
                onChange={(e) => updateBlockStyles('padding', e.target.value)}
                placeholder="16px"
              />
            </div>
          </div>

          {selectedBlock.type === 'text' && (
            <>
              <div>
                <Label htmlFor="font-size">{t('fontSize')}</Label>
                <Input
                  id="font-size"
                  value={selectedBlock.styles.fontSize || '16px'}
                  onChange={(e) => updateBlockStyles('fontSize', e.target.value)}
                  placeholder="16px"
                />
              </div>
              <div>
                <Label htmlFor="color">{t('textColor')}</Label>
                <Input
                  id="color"
                  type="color"
                  value={selectedBlock.styles.color || '#333333'}
                  onChange={(e) => updateBlockStyles('color', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="text-align">{t('textAlign')}</Label>
                <Select 
                  value={selectedBlock.styles.textAlign || 'left'} 
                  onValueChange={(value) => updateBlockStyles('textAlign', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedBlock.type === 'button' && (
            <>
              <div>
                <Label htmlFor="bg-color">{t('backgroundColor')}</Label>
                <Input
                  id="bg-color"
                  type="color"
                  value={selectedBlock.styles.backgroundColor || '#007aff'}
                  onChange={(e) => updateBlockStyles('backgroundColor', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="text-color">{t('textColor')}</Label>
                <Input
                  id="text-color"
                  type="color"
                  value={selectedBlock.styles.color || '#ffffff'}
                  onChange={(e) => updateBlockStyles('color', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="border-radius">{t('borderRadius')}</Label>
                <Input
                  id="border-radius"
                  value={selectedBlock.styles.borderRadius || '6px'}
                  onChange={(e) => updateBlockStyles('borderRadius', e.target.value)}
                  placeholder="6px"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};
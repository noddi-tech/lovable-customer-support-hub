import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useNewsletterStore } from './useNewsletterStore';
import { useDesignSystem } from '@/contexts/DesignSystemContext';

export const GlobalStylesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { globalStyles, updateGlobalStyles } = useNewsletterStore();
  const designSystem = useDesignSystem();

  const handleStyleChange = (field: string, value: string) => {
    updateGlobalStyles({ [field]: value });
  };

  const syncWithDesignSystem = () => {
    // TODO: Sync with actual design system when available
    updateGlobalStyles({
      primaryColor: '#007aff',
      secondaryColor: '#5856d6'
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="font-medium mb-2">{t('globalStyles')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('globalStylesDescription')}
          </p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={syncWithDesignSystem}
          className="w-full"
        >
          {t('syncWithDesignSystem')}
        </Button>

        <Separator />

        {/* Colors */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('colors')}</h4>
          
          <div>
            <Label htmlFor="primary-color">{t('primaryColor')}</Label>
            <Input
              id="primary-color"
              type="color"
              value={globalStyles.primaryColor}
              onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="secondary-color">{t('secondaryColor')}</Label>
            <Input
              id="secondary-color"
              type="color"
              value={globalStyles.secondaryColor}
              onChange={(e) => handleStyleChange('secondaryColor', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="background-color">{t('backgroundColor')}</Label>
            <Input
              id="background-color"
              type="color"
              value={globalStyles.backgroundColor}
              onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* Typography */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('typography')}</h4>
          
          <div>
            <Label htmlFor="font-family">{t('fontFamily')}</Label>
            <Select 
              value={globalStyles.fontFamily} 
              onValueChange={(value) => handleStyleChange('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system-ui, sans-serif">System Font</SelectItem>
                <SelectItem value="Georgia, serif">Georgia</SelectItem>
                <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                <SelectItem value="'Helvetica Neue', sans-serif">Helvetica Neue</SelectItem>
                <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="font-size">{t('baseFontSize')}</Label>
            <Select 
              value={globalStyles.fontSize} 
              onValueChange={(value) => handleStyleChange('fontSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="20px">20px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Layout */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('layout')}</h4>
          
          <div>
            <Label htmlFor="max-width">{t('maxWidth')}</Label>
            <Select 
              value={globalStyles.maxWidth} 
              onValueChange={(value) => handleStyleChange('maxWidth', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480px">480px (Mobile)</SelectItem>
                <SelectItem value="600px">600px (Standard)</SelectItem>
                <SelectItem value="800px">800px (Wide)</SelectItem>
                <SelectItem value="100%">100% (Full Width)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Preview */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('preview')}</h4>
          <div 
            className="p-4 border rounded-lg"
            style={{
              backgroundColor: globalStyles.backgroundColor,
              fontFamily: globalStyles.fontFamily,
              fontSize: globalStyles.fontSize
            }}
          >
            <h3 style={{ color: globalStyles.primaryColor, marginBottom: '8px' }}>
              {t('sampleHeading')}
            </h3>
            <p style={{ marginBottom: '12px' }}>
              {t('sampleText')}
            </p>
            <button
              style={{
                backgroundColor: globalStyles.primaryColor,
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              {t('sampleButton')}
            </button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
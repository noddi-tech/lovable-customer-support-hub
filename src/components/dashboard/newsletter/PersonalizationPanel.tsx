import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Copy, User, Mail, Building, Calendar, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

const MERGE_TAGS = [
  { tag: '{{FirstName}}', description: 'Customer first name', icon: User },
  { tag: '{{LastName}}', description: 'Customer last name', icon: User },
  { tag: '{{Email}}', description: 'Customer email address', icon: Mail },
  { tag: '{{Company}}', description: 'Customer company', icon: Building },
  { tag: '{{Date}}', description: 'Current date', icon: Calendar },
  { tag: '{{CustomField1}}', description: 'Custom field 1', icon: Tag },
  { tag: '{{CustomField2}}', description: 'Custom field 2', icon: Tag }
];

export const PersonalizationPanel: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [customTag, setCustomTag] = useState('');

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast({
      title: t('copied'),
      description: `${tag} ${t('copiedToClipboard')}`,
      duration: 2000
    });
  };

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      const formattedTag = `{{${customTag.trim()}}}`;
      handleCopyTag(formattedTag);
      setCustomTag('');
      toast({
        title: t('customTagCreated'),
        description: `${formattedTag} ${t('readyToUse')}`,
        duration: 2000
      });
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="font-medium mb-2">{t('personalization')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('personalizationDescription')}
          </p>
        </div>

        <Separator />

        {/* Merge Tags */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('mergeTags')}</h4>
          <p className="text-xs text-muted-foreground">
            {t('clickToCopyMergeTag')}
          </p>
          
          <div className="space-y-2">
            {MERGE_TAGS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.tag}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleCopyTag(item.tag)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {item.tag}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Custom Tags */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('customTags')}</h4>
          <div className="flex gap-2">
            <Input
              placeholder={t('enterCustomTagName')}
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddCustomTag}
              disabled={!customTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('customTagsDescription')}
          </p>
        </div>

        <Separator />

        {/* Conditional Content */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('conditionalContent')}</h4>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('comingSoon')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t('conditionalContentDescription')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* User Segmentation */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('userSegmentation')}</h4>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('comingSoon')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t('segmentationDescription')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Best Practices */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('bestPractices')}</h4>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                {t('personalizationTip1Title')}
              </p>
              <p className="text-blue-700 dark:text-blue-200">
                {t('personalizationTip1')}
              </p>
            </div>
            
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                {t('personalizationTip2Title')}
              </p>
              <p className="text-green-700 dark:text-green-200">
                {t('personalizationTip2')}
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                {t('personalizationTip3Title')}
              </p>
              <p className="text-orange-700 dark:text-orange-200">
                {t('personalizationTip3')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
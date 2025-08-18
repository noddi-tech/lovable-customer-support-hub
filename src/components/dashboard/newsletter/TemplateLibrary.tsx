import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Users, 
  Wrench, 
  Star, 
  FileText, 
  Plus 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useNewsletterStore } from './useNewsletterStore';

const TEMPLATE_BLOCKS = {
  'promotion-basic': [
    {
      id: 'promo-img',
      type: 'image' as const,
      content: { src: '', alt: 'Promotional banner', width: '100%', height: 'auto' },
      styles: { margin: '0', padding: '20px', textAlign: 'center' }
    },
    {
      id: 'promo-title',
      type: 'text' as const,
      content: { text: 'Special Offer - Limited Time!', tag: 'h1' },
      styles: { fontSize: '28px', color: '#333333', textAlign: 'center', margin: '0', padding: '16px' }
    },
    {
      id: 'promo-desc',
      type: 'text' as const,
      content: { text: 'Don\'t miss out on this amazing opportunity. Get 30% off your next purchase.', tag: 'p' },
      styles: { fontSize: '16px', color: '#666666', textAlign: 'center', margin: '0', padding: '16px' }
    },
    {
      id: 'promo-btn',
      type: 'button' as const,
      content: { text: 'Shop Now', href: '#', target: '_blank' },
      styles: { backgroundColor: '#007aff', color: '#ffffff', borderRadius: '6px', padding: '12px 24px', textAlign: 'center', margin: '20px auto' }
    }
  ],
  'hr-welcome': [
    {
      id: 'welcome-title',
      type: 'text' as const,
      content: { text: 'Welcome to the Team!', tag: 'h1' },
      styles: { fontSize: '32px', color: '#333333', textAlign: 'center', margin: '0', padding: '20px' }
    },
    {
      id: 'welcome-msg',
      type: 'text' as const,
      content: { text: 'We\'re excited to have you join our team. Here\'s everything you need to know to get started.', tag: 'p' },
      styles: { fontSize: '16px', color: '#666666', textAlign: 'left', margin: '0', padding: '16px' }
    },
    {
      id: 'welcome-divider',
      type: 'divider' as const,
      content: {},
      styles: { borderTop: '1px solid #e5e5e5', margin: '24px 0', padding: '0' }
    },
    {
      id: 'welcome-info',
      type: 'text' as const,
      content: { text: 'Your first day starts on Monday. Please bring your ID and signed contract.', tag: 'p' },
      styles: { fontSize: '14px', color: '#555555', textAlign: 'left', margin: '0', padding: '16px' }
    }
  ],
  'ops-update': [
    {
      id: 'ops-title',
      type: 'text' as const,
      content: { text: 'Operations Update', tag: 'h1' },
      styles: { fontSize: '28px', color: '#333333', textAlign: 'center', margin: '0', padding: '20px' }
    },
    {
      id: 'ops-date',
      type: 'text' as const,
      content: { text: new Date().toLocaleDateString(), tag: 'p' },
      styles: { fontSize: '14px', color: '#888888', textAlign: 'center', margin: '0', padding: '8px' }
    },
    {
      id: 'ops-content',
      type: 'text' as const,
      content: { text: 'Important updates regarding our operational procedures and upcoming changes.', tag: 'p' },
      styles: { fontSize: '16px', color: '#666666', textAlign: 'left', margin: '0', padding: '16px' }
    }
  ],
  'newsletter-basic': [
    {
      id: 'news-header',
      type: 'text' as const,
      content: { text: 'Monthly Newsletter', tag: 'h1' },
      styles: { fontSize: '32px', color: '#333333', textAlign: 'center', margin: '0', padding: '20px' }
    },
    {
      id: 'news-intro',
      type: 'text' as const,
      content: { text: 'Stay updated with the latest news and updates from our team.', tag: 'p' },
      styles: { fontSize: '16px', color: '#666666', textAlign: 'center', margin: '0', padding: '16px' }
    },
    {
      id: 'news-divider',
      type: 'divider' as const,
      content: {},
      styles: { borderTop: '2px solid #007aff', margin: '24px 0', padding: '0' }
    },
    {
      id: 'news-article',
      type: 'text' as const,
      content: { text: 'Feature Article: Latest developments in our industry', tag: 'h2' },
      styles: { fontSize: '20px', color: '#333333', textAlign: 'left', margin: '0', padding: '16px' }
    },
    {
      id: 'news-content',
      type: 'text' as const,
      content: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', tag: 'p' },
      styles: { fontSize: '16px', color: '#666666', textAlign: 'left', margin: '0', padding: '16px' }
    }
  ]
};

const TEMPLATES = [
  {
    id: 'promotion-basic',
    name: 'Basic Promotion',
    description: 'Simple promotional email with hero image and CTA',
    category: 'promotion',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'hr-welcome',
    name: 'Employee Welcome',
    description: 'Welcome new team members with important information',
    category: 'hr',
    icon: Users,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'ops-update',
    name: 'Operations Update',
    description: 'Keep team informed about operational changes',
    category: 'ops',
    icon: Wrench,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'newsletter-basic',
    name: 'Newsletter Template',
    description: 'Multi-section newsletter with articles and updates',
    category: 'newsletter',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Star },
  { id: 'promotion', name: 'Promotions', icon: Megaphone },
  { id: 'hr', name: 'HR Communications', icon: Users },
  { id: 'ops', name: 'Operations', icon: Wrench },
  { id: 'newsletter', name: 'Newsletters', icon: FileText }
];

export const TemplateLibrary: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { clearNewsletter, addBlock, updateBlock } = useNewsletterStore();
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const filteredTemplates = selectedCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(template => template.category === selectedCategory);

  const handleUseTemplate = (templateId: string) => {
    const templateBlocks = TEMPLATE_BLOCKS[templateId as keyof typeof TEMPLATE_BLOCKS];
    
    if (templateBlocks) {
      // Clear existing blocks and load template
      clearNewsletter();
      
      // Load template blocks into the store
      useNewsletterStore.setState(state => ({
        ...state,
        blocks: templateBlocks,
        selectedBlockId: null
      }));
      
      toast({
        title: t('templateLoaded'),
        description: t('templateLoadedDescription'),
      });
    }
  };

  const handleCreateTemplate = () => {
    toast({
      title: t('createTemplate'),
      description: t('createTemplateDescription'),
    });
    // TODO: Save current newsletter as template
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{t('templates')}</h3>
          <Button variant="outline" size="sm" onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('create')}
          </Button>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedCategory(category.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {category.name}
              </Button>
            );
          })}
        </div>

        {/* Templates */}
        <div className="space-y-3">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="overflow-hidden">
                <div className="aspect-video bg-muted/20 flex items-center justify-center">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    {t('useTemplate')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('noTemplatesFound')}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
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

// Header template used in all newsletters
const HEADER_TEMPLATE = {
  id: 'header',
  type: 'html' as const,
  content: { 
    html: `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center;">
        <img src="/placeholder.svg" alt="Company Logo" style="height: 48px; margin-bottom: 16px;" />
        <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">{{company_name}}</h1>
      </div>
    `
  },
  styles: { margin: '0', padding: '0' }
};

// Footer template used in all newsletters
const FOOTER_TEMPLATE = {
  id: 'footer',
  type: 'html' as const,
  content: { 
    html: `
      <div style="background: #f8f9fa; padding: 32px 24px; border-top: 1px solid #e9ecef;">
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="#" style="color: #007aff; text-decoration: none; margin: 0 16px; font-weight: 500;">About Us</a>
          <a href="#" style="color: #007aff; text-decoration: none; margin: 0 16px; font-weight: 500;">Contact</a>
          <a href="#" style="color: #007aff; text-decoration: none; margin: 0 16px; font-weight: 500;">Privacy Policy</a>
          <a href="#" style="color: #007aff; text-decoration: none; margin: 0 16px; font-weight: 500;">Terms</a>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <p style="color: #6c757d; font-size: 14px; margin: 8px 0;">{{company_address}}</p>
          <p style="color: #6c757d; font-size: 14px; margin: 8px 0;">{{company_phone}} | {{company_email}}</p>
        </div>
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #dee2e6;">
          <a href="{{unsubscribe_url}}" style="color: #dc3545; text-decoration: none; font-size: 12px;">Unsubscribe from these emails</a>
        </div>
      </div>
    `
  },
  styles: { margin: '0', padding: '0' }
};

const TEMPLATE_BLOCKS = {
  'promotion-flash-sale': [
    HEADER_TEMPLATE,
    {
      id: 'promo-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="background: linear-gradient(45deg, #ff6b6b, #feca57); padding: 48px 24px; text-align: center; color: white;">
            <h1 style="font-size: 42px; font-weight: bold; margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚡ FLASH SALE ⚡</h1>
            <p style="font-size: 24px; margin: 0 0 24px 0; opacity: 0.95;">LIMITED TIME ONLY</p>
            <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 24px; margin: 24px auto; max-width: 400px;">
              <span style="font-size: 72px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">50% OFF</span>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'promo-details',
      type: 'text' as const,
      content: { text: 'Don\'t miss out on our biggest sale of the year! Use code FLASH50 at checkout to save 50% on all items. Sale ends in 24 hours!', tag: 'p' },
      styles: { fontSize: '18px', color: '#333333', textAlign: 'center', margin: '0', padding: '32px 24px', lineHeight: '1.6' }
    },
    {
      id: 'promo-cta',
      type: 'button' as const,
      content: { text: '🛒 Shop Now & Save 50%', href: '#', target: '_blank' },
      styles: { backgroundColor: '#ff6b6b', color: '#ffffff', borderRadius: '30px', padding: '16px 32px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto', border: 'none', boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)' }
    },
    FOOTER_TEMPLATE
  ],
  
  'promotion-product-launch': [
    HEADER_TEMPLATE,
    {
      id: 'launch-announcement',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 48px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0;">🚀 NEW PRODUCT LAUNCH</h1>
            <p style="font-size: 20px; margin: 0; opacity: 0.9;">Introducing our latest innovation</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'product-showcase',
      type: 'image' as const,
      content: { src: '/placeholder.svg', alt: 'New Product', width: '100%', height: 'auto' },
      styles: { margin: '0', padding: '24px', textAlign: 'center' }
    },
    {
      id: 'product-description',
      type: 'text' as const,
      content: { text: 'Meet our revolutionary new product that will change the way you work. Packed with cutting-edge features and designed with you in mind.', tag: 'p' },
      styles: { fontSize: '18px', color: '#333333', textAlign: 'center', margin: '0', padding: '0 24px 32px 24px', lineHeight: '1.6' }
    },
    {
      id: 'early-bird-cta',
      type: 'button' as const,
      content: { text: 'Get Early Bird Access', href: '#', target: '_blank' },
      styles: { backgroundColor: '#667eea', color: '#ffffff', borderRadius: '8px', padding: '16px 32px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', margin: '0 auto 32px auto' }
    },
    FOOTER_TEMPLATE
  ],

  'newsletter-weekly-digest': [
    HEADER_TEMPLATE,
    {
      id: 'newsletter-intro',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px; background: #f8f9fa; border-left: 4px solid #007aff;">
            <h2 style="color: #333333; font-size: 24px; margin: 0 0 16px 0;">📰 Weekly Digest</h2>
            <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.6;">Stay informed with this week's top stories and updates from our team.</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'featured-article',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <h3 style="color: #333333; font-size: 22px; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #007aff;">🌟 Featured Article</h3>
            <h4 style="color: #007aff; font-size: 18px; margin: 0 0 12px 0;">Industry Trends: What's Coming Next</h4>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Discover the latest trends shaping our industry and how they might impact your business in the coming months...</p>
            <a href="#" style="color: #007aff; text-decoration: none; font-weight: 500;">Read Full Article →</a>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'quick-updates',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px; background: #f8f9fa;">
            <h3 style="color: #333333; font-size: 22px; margin: 0 0 24px 0;">⚡ Quick Updates</h3>
            <div style="margin-bottom: 16px;">
              <strong style="color: #333333;">Product Update:</strong>
              <span style="color: #666666;"> New features released in v2.1</span>
            </div>
            <div style="margin-bottom: 16px;">
              <strong style="color: #333333;">Team News:</strong>
              <span style="color: #666666;"> Welcome our new marketing director</span>
            </div>
            <div>
              <strong style="color: #333333;">Event:</strong>
              <span style="color: #666666;"> Join us at the annual conference next month</span>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    FOOTER_TEMPLATE
  ],

  'newsletter-monthly-insights': [
    HEADER_TEMPLATE,
    {
      id: 'monthly-header',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 40px 24px; text-align: center; background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white;">
            <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">📊 Monthly Insights</h1>
            <p style="font-size: 16px; margin: 0; opacity: 0.9;">{{current_month}} {{current_year}} Edition</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'insights-grid',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
              <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; border-left: 4px solid #74b9ff;">
                <h4 style="color: #333333; font-size: 18px; margin: 0 0 12px 0;">📈 Performance</h4>
                <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0;">Key metrics and achievements from this month's activities.</p>
              </div>
              <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; border-left: 4px solid #00b894;">
                <h4 style="color: #333333; font-size: 18px; margin: 0 0 12px 0;">🎯 Goals</h4>
                <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0;">Progress on our strategic objectives and upcoming targets.</p>
              </div>
            </div>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'detailed-analysis',
      type: 'text' as const,
      content: { text: 'This month brought significant developments across multiple areas. Our team achieved record-breaking results while maintaining our commitment to quality and innovation. Looking ahead, we\'re excited about the opportunities that lie ahead.', tag: 'p' },
      styles: { fontSize: '16px', color: '#333333', textAlign: 'left', margin: '0', padding: '0 24px 32px 24px', lineHeight: '1.6' }
    },
    FOOTER_TEMPLATE
  ],

  'hr-welcome': [
    HEADER_TEMPLATE,
    {
      id: 'welcome-hero',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 48px 24px; text-align: center; background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0 0 16px 0;">🎉 Welcome to the Team!</h1>
            <p style="font-size: 18px; margin: 0; opacity: 0.9;">We're thrilled to have you join our family</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'welcome-message',
      type: 'text' as const,
      content: { text: 'Dear {{employee_name}}, welcome aboard! We\'re excited to have you join our team and look forward to the fresh perspectives and ideas you\'ll bring. Your journey with us starts now, and we\'re here to support you every step of the way.', tag: 'p' },
      styles: { fontSize: '16px', color: '#333333', textAlign: 'left', margin: '0', padding: '32px 24px', lineHeight: '1.6' }
    },
    {
      id: 'next-steps',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 24px; background: #f8f9fa; margin: 0 24px 32px 24px; border-radius: 8px;">
            <h3 style="color: #333333; font-size: 20px; margin: 0 0 16px 0;">📋 Your First Week</h3>
            <ul style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Monday: Orientation and office tour</li>
              <li>Tuesday: Meet your team and manager</li>
              <li>Wednesday: IT setup and system access</li>
              <li>Thursday: Training sessions begin</li>
              <li>Friday: Welcome lunch with the team</li>
            </ul>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    FOOTER_TEMPLATE
  ],

  'ops-update': [
    HEADER_TEMPLATE,
    {
      id: 'ops-announcement',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 32px 24px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <h2 style="color: #856404; font-size: 24px; margin: 0 0 16px 0;">⚙️ Operations Update</h2>
            <p style="color: #856404; font-size: 16px; margin: 0; font-weight: 500;">Important changes to our operational procedures</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    {
      id: 'update-details',
      type: 'text' as const,
      content: { text: 'Effective immediately, we are implementing new operational procedures to improve efficiency and better serve our customers. These changes affect scheduling, reporting, and communication protocols.', tag: 'p' },
      styles: { fontSize: '16px', color: '#333333', textAlign: 'left', margin: '0', padding: '32px 24px', lineHeight: '1.6' }
    },
    {
      id: 'action-required',
      type: 'html' as const,
      content: { 
        html: `
          <div style="padding: 24px; background: #d4edda; margin: 0 24px 32px 24px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; font-size: 18px; margin: 0 0 12px 0;">✅ Action Required</h3>
            <p style="color: #155724; font-size: 16px; line-height: 1.5; margin: 0;">Please review the updated procedures document and confirm your understanding by {{deadline_date}}.</p>
          </div>
        `
      },
      styles: { margin: '0', padding: '0' }
    },
    FOOTER_TEMPLATE
  ]
};

const TEMPLATES = [
  {
    id: 'promotion-flash-sale',
    name: 'Flash Sale',
    description: 'Eye-catching sale promotion with countdown urgency',
    category: 'promotion',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'promotion-product-launch',
    name: 'Product Launch',
    description: 'Professional product announcement with showcase',
    category: 'promotion',
    icon: Megaphone,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'newsletter-weekly-digest',
    name: 'Weekly Digest',
    description: 'News roundup with featured articles and quick updates',
    category: 'newsletter',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'newsletter-monthly-insights',
    name: 'Monthly Insights',
    description: 'Comprehensive monthly report with analytics and goals',
    category: 'newsletter',
    icon: FileText,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'hr-welcome',
    name: 'Employee Welcome',
    description: 'Warm welcome message with onboarding schedule',
    category: 'hr',
    icon: Users,
    preview: '/api/placeholder/300/200'
  },
  {
    id: 'ops-update',
    name: 'Operations Update',
    description: 'Important operational changes with action items',
    category: 'ops',
    icon: Wrench,
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
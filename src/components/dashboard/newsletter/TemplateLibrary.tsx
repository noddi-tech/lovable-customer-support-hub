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
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const filteredTemplates = selectedCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(template => template.category === selectedCategory);

  const handleUseTemplate = (templateId: string) => {
    toast({
      title: t('templateLoaded'),
      description: t('templateLoadedDescription'),
    });
    // TODO: Load template blocks into the newsletter
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
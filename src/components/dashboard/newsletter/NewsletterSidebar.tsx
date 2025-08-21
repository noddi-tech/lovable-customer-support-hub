import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Mail,
  FileText,
  Calendar,
  Send,
  Clock,
  Layout,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNewsletter } from '@/contexts/NewsletterContext';
import { NewsletterListView } from './NewsletterListView';

interface NewsletterSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export const NewsletterSidebar: React.FC<NewsletterSidebarProps> = ({ 
  selectedSection, 
  onSectionChange 
}) => {
  const { state, setFilters, createNewsletter, selectNewsletter } = useNewsletter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ searchQuery: query });
  };

  const handleCreateNewsletter = () => {
    const newNewsletter = createNewsletter({
      title: 'Untitled Newsletter',
      description: '',
      status: 'draft',
      blocks: [],
      global_styles: {
        primaryColor: '#007aff',
        secondaryColor: '#5856d6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        backgroundColor: '#ffffff',
        maxWidth: '600px'
      }
    });
    // Automatically select the new newsletter
    setTimeout(() => {
      const latestNewsletter = state.newsletters[0]; // Assuming newest is first
      if (latestNewsletter) {
        selectNewsletter(latestNewsletter.id);
      }
    }, 100);
  };

  const getNewsletterCountByStatus = (status: string) => {
    if (status === 'all') return state.newsletters.length;
    if (status === 'templates') return state.newsletters.filter(n => n.template).length;
    return state.newsletters.filter(n => n.status === status).length;
  };

  const sidebarItems = [
    { 
      id: 'all', 
      label: 'All Newsletters', 
      icon: Mail, 
      count: getNewsletterCountByStatus('all')
    },
    { 
      id: 'draft', 
      label: 'Drafts', 
      icon: FileText, 
      count: getNewsletterCountByStatus('draft'),
      color: 'text-gray-500'
    },
    { 
      id: 'scheduled', 
      label: 'Scheduled', 
      icon: Calendar, 
      count: getNewsletterCountByStatus('scheduled'),
      color: 'text-blue-500'
    },
    { 
      id: 'sent', 
      label: 'Sent', 
      icon: Send, 
      count: getNewsletterCountByStatus('sent'),
      color: 'text-green-500'
    },
    { 
      id: 'templates', 
      label: 'Templates', 
      icon: Layout, 
      count: getNewsletterCountByStatus('templates'),
      color: 'text-purple-500'
    }
  ];

  const renderSidebarItems = (items: typeof sidebarItems) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isSelected = selectedSection === item.id;
      const showCount = item.count > 0;
      
      return (
        <Button
          key={item.id}
          variant="ghost"
          className={cn(
            "w-full justify-start px-3 py-2 h-auto font-normal",
            isSelected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
          )}
          onClick={() => onSectionChange(item.id)}
        >
          <Icon className={cn("mr-3 h-4 w-4", item.color)} />
          <span className="flex-1 text-left">{item.label}</span>
          {showCount && (
            <Badge 
              variant={isSelected ? "default" : "secondary"} 
              className="ml-auto h-5 text-xs"
            >
              {item.count}
            </Badge>
          )}
        </Button>
      );
    });
  };

  // Show newsletter list for newsletter sections
  const shouldShowNewsletterList = selectedSection !== 'nav' && selectedSection !== 'templates';
  
  return (
    <div className="pane flex flex-col bg-card/90 backdrop-blur-sm shadow-surface h-full">
      {shouldShowNewsletterList ? (
        // Newsletter List View
        <div className="flex flex-col h-full">
          {/* Header with create button */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                {sidebarItems.find(item => item.id === selectedSection)?.label || 'Newsletters'}
              </h3>
              <Button
                size="sm"
                onClick={handleCreateNewsletter}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search newsletters..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
          
          {/* Newsletter List */}
          <div className="flex-1 min-h-0">
            <NewsletterListView 
              newsletters={state.newsletters} 
              isLoading={state.isLoading}
            />
          </div>
        </div>
      ) : (
        // Navigation Sidebar
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2">
            {/* Create Newsletter Button */}
            <div className="px-2 pt-4 pb-2">
              <Button
                onClick={handleCreateNewsletter}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Create Newsletter
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Newsletter Status Sections */}
            <div className="px-2">
              <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-sm font-medium text-muted-foreground">Newsletters</h3>
              </div>
              
              <div className="space-y-1">
                {renderSidebarItems(sidebarItems)}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Quick Actions */}
            <div className="px-2 pb-4">
              <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
              </div>
              
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 h-auto font-normal"
                  onClick={() => onSectionChange('templates')}
                >
                  <Layout className="mr-3 h-4 w-4 text-purple-500" />
                  <span className="flex-1 text-left">Browse Templates</span>
                </Button>
              </div>
              
              <div className="px-2 py-2 text-xs text-muted-foreground italic">
                Email settings can be found in Settings → Admin → Integrations
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
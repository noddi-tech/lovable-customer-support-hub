import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Calendar, 
  Clock, 
  Eye,
  Edit,
  Copy,
  Trash2,
  Send,
  MoreVertical,
  Users
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNewsletter, Newsletter } from '@/contexts/NewsletterContext';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface NewsletterListViewProps {
  newsletters?: Newsletter[];
  isLoading?: boolean;
}

export const NewsletterListView: React.FC<NewsletterListViewProps> = ({ 
  newsletters = [], 
  isLoading = false 
}) => {
  const { state, selectNewsletter, duplicateNewsletter, deleteNewsletter } = useNewsletter();

  const getStatusColor = (status: Newsletter['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Newsletter['status']) => {
    switch (status) {
      case 'sent':
        return <Send className="h-3 w-3" />;
      case 'scheduled':
        return <Calendar className="h-3 w-3" />;
      case 'paused':
        return <Clock className="h-3 w-3" />;
      case 'draft':
      default:
        return <Edit className="h-3 w-3" />;
    }
  };

  const handleNewsletterClick = (newsletter: Newsletter) => {
    selectNewsletter(newsletter.id);
  };

  const handleDuplicate = (newsletter: Newsletter, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateNewsletter(newsletter.id);
  };

  const handleDelete = (newsletter: Newsletter, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${newsletter.title}"?`)) {
      deleteNewsletter(newsletter.id);
    }
  };

  const filteredNewsletters = newsletters.filter(newsletter => {
    if (state.filters.status === 'all') return true;
    if (state.filters.status === 'templates') return newsletter.template;
    return newsletter.status === state.filters.status;
  }).filter(newsletter => {
    if (!state.filters.searchQuery) return true;
    return newsletter.title.toLowerCase().includes(state.filters.searchQuery.toLowerCase()) ||
           newsletter.description?.toLowerCase().includes(state.filters.searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading newsletters...</p>
        </div>
      </div>
    );
  }

  if (filteredNewsletters.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-8">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No newsletters found</h3>
          <p className="text-muted-foreground">
            {state.filters.searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first newsletter'
            }
          </p>
        </div>
      </div>
    );
  }

  if (state.viewMode === 'grid') {
    return (
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filteredNewsletters.map((newsletter, index) => (
            <Card 
              key={newsletter.id} 
              className={cn(
                "transition-all duration-200 hover:shadow-md cursor-pointer animate-fade-in",
                state.selectedNewsletterId === newsletter.id && "ring-2 ring-primary bg-accent/50"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleNewsletterClick(newsletter)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getStatusColor(newsletter.status))}>
                      {getStatusIcon(newsletter.status)}
                      <span className="ml-1">{newsletter.status}</span>
                    </Badge>
                    {newsletter.template && (
                      <Badge variant="outline" className="text-xs">
                        Template
                      </Badge>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleNewsletterClick(newsletter)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDuplicate(newsletter, e)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(newsletter, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="font-semibold text-base mb-1 line-clamp-1">
                  {newsletter.title}
                </h3>
                
                {newsletter.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {newsletter.description}
                  </p>
                )}
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Updated {formatDistanceToNow(new Date(newsletter.updated_at), { addSuffix: true })}</span>
                  </div>
                  
                  {newsletter.analytics && (
                    <div className="flex items-center gap-4">
                      {newsletter.analytics.sent_count && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{newsletter.analytics.sent_count}</span>
                        </div>
                      )}
                      {newsletter.analytics.open_rate && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{newsletter.analytics.open_rate}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // List view
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-2">
        {filteredNewsletters.map((newsletter, index) => (
          <Card 
            key={newsletter.id} 
            className={cn(
              "transition-all duration-200 hover:shadow-md cursor-pointer animate-fade-in hover-scale",
              state.selectedNewsletterId === newsletter.id && "ring-2 ring-primary bg-accent/50"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleNewsletterClick(newsletter)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base line-clamp-1">
                        {newsletter.title}
                      </h3>
                      <Badge className={cn("text-xs", getStatusColor(newsletter.status))}>
                        {getStatusIcon(newsletter.status)}
                        <span className="ml-1">{newsletter.status}</span>
                      </Badge>
                      {newsletter.template && (
                        <Badge variant="outline" className="text-xs">
                          Template
                        </Badge>
                      )}
                    </div>
                    
                    {newsletter.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {newsletter.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Updated {formatDistanceToNow(new Date(newsletter.updated_at), { addSuffix: true })}</span>
                      
                      {newsletter.scheduled_for && (
                        <span>Scheduled for {format(new Date(newsletter.scheduled_for), 'MMM d, yyyy')}</span>
                      )}
                      
                      {newsletter.sent_at && (
                        <span>Sent {format(new Date(newsletter.sent_at), 'MMM d, yyyy')}</span>
                      )}
                      
                      {newsletter.analytics?.sent_count && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{newsletter.analytics.sent_count} recipients</span>
                        </div>
                      )}
                      
                      {newsletter.analytics?.open_rate && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{newsletter.analytics.open_rate}% opened</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleNewsletterClick(newsletter)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDuplicate(newsletter, e)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(newsletter, e)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
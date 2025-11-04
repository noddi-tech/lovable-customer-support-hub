import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useUserActivity } from '@/hooks/useUserActivity';
import { Activity, User, Target, Calendar, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserActivityTimelineProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionCategoryColors: Record<string, string> = {
  user_management: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
  org_management: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200',
  role_management: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200',
  bulk_management: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',
};

export function UserActivityTimeline({ userId, userEmail, open, onOpenChange }: UserActivityTimelineProps) {
  const { data: activities = [], isLoading } = useUserActivity(userId, open);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredActivities = activities.filter(activity => 
    categoryFilter === 'all' || activity.action_category === categoryFilter
  );

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a));

  // Calculate stats
  const totalActions = activities.length;
  const actionTypes = new Set(activities.map(a => a.action_type));
  const mostCommonAction = activities.reduce((acc, activity) => {
    acc[activity.action_type] = (acc[activity.action_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topAction = Object.entries(mostCommonAction).sort((a, b) => b[1] - a[1])[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Activity Timeline - {userEmail}
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Total Actions</div>
            <div className="text-2xl font-bold">{totalActions}</div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Action Types</div>
            <div className="text-2xl font-bold">{actionTypes.size}</div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Most Common</div>
            <div className="text-sm font-medium truncate">
              {topAction ? topAction[0] : 'N/A'}
            </div>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="user_management">User Management</SelectItem>
              <SelectItem value="org_management">Organization</SelectItem>
              <SelectItem value="role_management">Role Management</SelectItem>
              <SelectItem value="bulk_management">Bulk Operations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-6 pr-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No activity found</p>
              </div>
            ) : (
              sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</h4>
                  </div>
                  <div className="space-y-2 pl-6 border-l-2 border-border">
                    {groupedActivities[date].map((activity) => {
                      const categoryColor = actionCategoryColors[activity.action_category] || actionCategoryColors.user_management;
                      
                      return (
                        <div key={activity.id} className="relative pl-4 pb-4">
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-2 -translate-x-[calc(50%+0.5rem)] w-2 h-2 rounded-full bg-primary" />
                          
                          {/* Activity card */}
                          <Card className={`p-3 ${categoryColor} border`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.action_type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {activity.action_category.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Target className="h-3.5 w-3.5" />
                                  <span className="font-medium">{activity.target_identifier}</span>
                                  <span className="text-muted-foreground">({activity.target_type})</span>
                                </div>
                                {Object.keys(activity.changes).length > 0 && (
                                  <details className="text-xs mt-2">
                                    <summary className="cursor-pointer text-primary hover:underline">
                                      View changes
                                    </summary>
                                    <pre className="mt-1 p-2 bg-background/50 rounded text-xs overflow-auto">
                                      {JSON.stringify(activity.changes, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(activity.created_at), 'HH:mm:ss')}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

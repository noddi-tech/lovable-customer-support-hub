import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Download, RefreshCw, Search, Calendar, User, Target, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { Heading } from '@/components/ui/heading';

type DateRange = '7d' | '30d' | '90d' | 'all';

interface AuditLog {
  id: string;
  created_at: string;
  actor_email: string;
  actor_role: string;
  action_type: string;
  action_category: string;
  target_type: string;
  target_identifier: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
}

const actionCategoryInfo: Record<string, { icon: any; label: string; color: string }> = {
  user_management: { icon: User, label: 'User Management', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  org_management: { icon: Target, label: 'Organization', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  role_management: { icon: Settings, label: 'Role Management', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  bulk_management: { icon: ScrollText, label: 'Bulk Operations', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
};

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', dateRange, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      // Apply date range filter
      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('action_category', categoryFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data as AuditLog[];
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if enabled
  });

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.actor_email.toLowerCase().includes(query) ||
      log.target_identifier.toLowerCase().includes(query) ||
      log.action_type.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Actor', 'Role', 'Action', 'Category', 'Target Type', 'Target', 'Changes'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.actor_email,
        log.actor_role,
        log.action_type,
        log.action_category,
        log.target_type,
        log.target_identifier,
        JSON.stringify(log.changes).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <UnifiedAppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <Heading level={1}>Audit Logs</Heading>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by actor, target, or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="user_management">User Management</SelectItem>
                <SelectItem value="org_management">Organization</SelectItem>
                <SelectItem value="role_management">Role Management</SelectItem>
                <SelectItem value="bulk_management">Bulk Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Actions</div>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Unique Actors</div>
            <div className="text-2xl font-bold">
              {new Set(filteredLogs.map(l => l.actor_email)).size}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Categories</div>
            <div className="text-2xl font-bold">
              {new Set(filteredLogs.map(l => l.action_category)).size}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Time Range</div>
            <div className="text-2xl font-bold">
              {dateRange === 'all' ? 'All' : dateRange}
            </div>
          </Card>
        </div>

        {/* Audit Log Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actor</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Action</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Target</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Changes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <ScrollText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No audit logs found</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const categoryInfo = actionCategoryInfo[log.action_category] || actionCategoryInfo.user_management;
                    const Icon = categoryInfo.icon;
                    
                    return (
                      <tr key={log.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                        <td className="p-4 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(log.created_at), 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{log.actor_email}</span>
                            <Badge variant="outline" className="w-fit mt-1 text-xs">
                              {log.actor_role}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${categoryInfo.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{log.action_type}</span>
                              <span className="text-xs text-muted-foreground">{categoryInfo.label}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{log.target_identifier}</span>
                            <span className="text-xs text-muted-foreground capitalize">{log.target_type}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <details className="cursor-pointer">
                            <summary className="text-primary hover:underline">View details</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-md">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}

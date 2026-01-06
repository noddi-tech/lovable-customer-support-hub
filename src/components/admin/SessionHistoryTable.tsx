import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceStrict } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Tablet, Clock, LogIn, LogOut } from 'lucide-react';

interface SessionHistoryTableProps {
  userId: string;
  limit?: number;
}

interface UserSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_active_at: string;
  session_type: string;
  device_type: string | null;
  browser: string | null;
  is_active: boolean;
  end_reason: string | null;
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

function getSessionDuration(startedAt: string, endedAt: string | null, lastActiveAt: string): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date(lastActiveAt);
  return formatDistanceStrict(start, end);
}

function getEndReasonBadge(endReason: string | null, isActive: boolean) {
  if (isActive) {
    return <Badge variant="default" className="bg-green-500">Active</Badge>;
  }

  switch (endReason) {
    case 'logout':
      return <Badge variant="secondary">Logged out</Badge>;
    case 'timeout':
      return <Badge variant="outline">Timed out</Badge>;
    case 'page_close':
      return <Badge variant="outline">Closed tab</Badge>;
    case 'session_replaced':
      return <Badge variant="outline">New session</Badge>;
    default:
      return <Badge variant="outline">Ended</Badge>;
  }
}

export function SessionHistoryTable({ userId, limit = 10 }: SessionHistoryTableProps) {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['user-sessions', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserSession[];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No login sessions recorded
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Login Time</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Device</TableHead>
          <TableHead>Browser</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {format(new Date(session.started_at), 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(session.started_at), 'h:mm a')}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {getSessionDuration(session.started_at, session.ended_at, session.last_active_at)}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {getDeviceIcon(session.device_type)}
                <span className="capitalize">{session.device_type || 'Desktop'}</span>
              </div>
            </TableCell>
            <TableCell>{session.browser || 'Unknown'}</TableCell>
            <TableCell>
              {getEndReasonBadge(session.end_reason, session.is_active)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

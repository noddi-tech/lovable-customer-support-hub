import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, CheckCircle, XCircle, Clock, Send, RefreshCw, User } from 'lucide-react';
import { useInviteEmailLogs, InviteEmailLog } from '@/hooks/useInviteEmailLogs';

interface InviteHistoryDialogProps {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteHistoryDialog({ email, open, onOpenChange }: InviteHistoryDialogProps) {
  const { data: logs = [], isLoading } = useInviteEmailLogs(email);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'bounced':
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
      bounced: 'bg-destructive/10 text-destructive',
      failed: 'bg-destructive/10 text-destructive',
      not_applicable: 'bg-muted text-muted-foreground',
    };
    return variants[status] || 'bg-muted text-muted-foreground';
  };

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'invite':
        return 'Initial Invite';
      case 'resend_invite':
        return 'Resent Invite';
      case 'direct_creation':
        return 'Direct Creation';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite History
          </DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No invite emails sent to this user</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: InviteEmailLog) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <Badge className={`text-xs ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at))} ago
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{getEmailTypeLabel(log.email_type)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="capitalize">{log.provider.replace('_', ' ')}</span>
                    </div>
                    {log.metadata?.resent_by && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Sent by:</span>
                        <span className="text-xs">{log.metadata.resent_by}</span>
                      </div>
                    )}
                    {log.error_message && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Target, Calendar, Activity, Code } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  created_at: string;
  actor_id?: string;
  actor_email: string;
  actor_role: string;
  action_type: string;
  action_category: string;
  target_type: string;
  target_id?: string;
  target_identifier: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  organization_id?: string;
}

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionTypeDescriptions: Record<string, string> = {
  'user.role.assign': 'Assigned a role to a user',
  'user.role.remove': 'Removed a role from a user',
  'user.update': 'Updated user profile information',
  'user.delete': 'Deleted a user account',
  'user.create': 'Created a new user account',
  'org.create': 'Created a new organization',
  'org.update': 'Updated organization details',
  'org.delete': 'Deleted an organization',
  'org.member.add': 'Added a user to an organization',
  'org.member.remove': 'Removed a user from an organization',
  'org.member.role.update': 'Updated user role in organization',
  'bulk.users.import': 'Imported multiple users',
  'bulk.users.export': 'Exported user data',
  'bulk.roles.assign': 'Assigned roles to multiple users',
};

export function AuditLogDetailModal({ log, open, onOpenChange }: AuditLogDetailModalProps) {
  if (!log) return null;

  const description = actionTypeDescriptions[log.action_type] || 'Performed an action';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Action Description</h4>
              <p className="text-base">{description}</p>
            </div>

            <Separator />

            {/* Actor Information */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Actor Information
              </h4>
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{log.actor_email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <div className="mt-1">
                      <Badge variant="outline">{log.actor_role}</Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Actor ID:</span>
                    <p className="font-mono text-xs">{log.actor_id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Details */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Action Details
              </h4>
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Action Type:</span>
                    <p className="font-medium">{log.action_type}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <p className="font-medium capitalize">{log.action_category.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Information */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target Information
              </h4>
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Target Type:</span>
                    <p className="font-medium capitalize">{log.target_type}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Target:</span>
                    <p className="font-medium">{log.target_identifier}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Target ID:</span>
                    <p className="font-mono text-xs">{log.target_id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Changes
              </h4>
              <div className="bg-muted/30 p-4 rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(log.changes, null, 2)}
                </pre>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Metadata
              </h4>
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Timestamp:</span>
                  <p className="font-medium">
                    {format(new Date(log.created_at), 'PPpp')}
                  </p>
                </div>
                {log.organization_id && (
                  <div>
                    <span className="text-sm text-muted-foreground">Organization ID:</span>
                    <p className="font-mono text-xs">{log.organization_id}</p>
                  </div>
                )}
                {log.metadata?.user_agent && (
                  <div>
                    <span className="text-sm text-muted-foreground">User Agent:</span>
                    <p className="text-xs break-all">{log.metadata.user_agent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { Phone, Clock, CheckCircle, AlertCircle, User, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCallbackRequests, CallbackRequest } from '@/hooks/useCallbackRequests';
import { AgentAssignmentSelect } from './AgentAssignmentSelect';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-amber-600'
  },
  processed: {
    label: 'Processed',
    icon: User,
    variant: 'default' as const,
    color: 'text-blue-600'
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600'
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  }
};

interface CallbackRequestCardProps {
  request: any;
  onStatusChange: (id: string, status: string) => void;
  onAssign: (id: string, agentId: string) => void;
  isUpdating: boolean;
  isAssigning: boolean;
}

const CallbackRequestCard = ({ request, onStatusChange, onAssign, isUpdating, isAssigning }: CallbackRequestCardProps) => {
  const { t } = useTranslation();
  const config = statusConfig[request.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    // Basic phone formatting - can be enhanced
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {formatPhoneNumber(request.customer_phone)}
            </CardTitle>
          </div>
          <Badge variant={config.variant} className="flex items-center gap-1">
            <StatusIcon className={`h-3 w-3 ${config.color}`} />
            {config.label}
          </Badge>
        </div>
        <CardDescription>
          Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Request Details */}
          {request.event_data?.branch && (
            <div className="text-sm">
              <span className="text-muted-foreground">IVR Branch:</span>
              <span className="ml-2 font-medium">{request.event_data.branch}</span>
            </div>
          )}

          {request.calls && (
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Call started:</span>
                <span className="ml-2">
                  {formatDistanceToNow(new Date(request.calls.started_at), { addSuffix: true })}
                </span>
              </div>
              {request.calls.agent_phone && (
                <div>
                  <span className="text-muted-foreground">Agent:</span>
                  <span className="ml-2">{formatPhoneNumber(request.calls.agent_phone)}</span>
                </div>
              )}
            </div>
          )}

          {/* Auto-completion notice */}
          {request.status === 'completed' && request.processed_at && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Auto-completed by outbound call
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Callback automatically marked as completed when agent called customer
              </p>
            </div>
          )}

          {/* Assignment Section */}
          <div className="border-t pt-3">
            <div className="text-sm text-muted-foreground mb-2">Assignment</div>
            <AgentAssignmentSelect
              currentAssigneeId={request.assigned_to_id}
              onAssign={(agentId) => onAssign(request.id, agentId)}
              isAssigning={isAssigning}
              placeholder="Assign to agent"
            />
          </div>

          {/* Status Actions */}
          {request.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Select
                onValueChange={(value) => onStatusChange(request.id, value)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Update status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processed">Mark Processed</SelectItem>
                  <SelectItem value="completed">Mark Completed</SelectItem>
                  <SelectItem value="failed">Mark Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {request.processed_at && (
            <div className="text-xs text-muted-foreground">
              {request.status === 'completed' ? 'Completed' : 'Processed'} {formatDistanceToNow(new Date(request.processed_at), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface CallbackRequestsListProps {
  statusFilter?: string;
}

export const CallbackRequestsList: React.FC<CallbackRequestsListProps> = ({ statusFilter }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>(statusFilter || 'all');
  
  const {
    callbackRequests,
    pendingRequests,
    processedRequests,
    completedRequests,
    requestsByStatus,
    isLoading,
    error,
    updateStatus,
    isUpdating,
    assignCallback,
    isAssigning
  } = useCallbackRequests();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Requests</CardTitle>
          <CardDescription>
            Failed to load callback requests. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Use statusFilter from props or local filter state
  const effectiveFilter = statusFilter || filter;

  const filteredRequests = effectiveFilter === 'all' 
    ? callbackRequests
    : callbackRequests.filter(req => req.status === effectiveFilter);

  return (
    <div className="space-y-4">
      {!statusFilter && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Callback Requests</h3>
            <p className="text-sm text-muted-foreground">
              Customer callback requests from IVR
            </p>
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">
                Pending ({requestsByStatus.pending || 0})
              </SelectItem>
              <SelectItem value="processed">
                Processed ({requestsByStatus.processed || 0})
              </SelectItem>
              <SelectItem value="completed">
                Completed ({requestsByStatus.completed || 0})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}


      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {effectiveFilter === 'all' 
                ? 'No callback requests yet'
                : `No ${effectiveFilter} callback requests`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request: any) => (
            <CallbackRequestCard
              key={request.id}
              request={request}
              onStatusChange={(id, status) => updateStatus({ id, status })}
              onAssign={(id, agentId) => assignCallback({ callbackId: id, agentId })}
              isUpdating={isUpdating}
              isAssigning={isAssigning}
            />
          ))}
        </div>
      )}
    </div>
  );
};
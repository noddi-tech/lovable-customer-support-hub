import React, { useState } from 'react';
import { Phone, ArrowUpRight, ArrowDownLeft, Clock, User, Filter, MessageSquare, Calendar, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalls } from '@/hooks/useCalls';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { formatDistanceToNow, format } from 'date-fns';
import { CallDetailsDialog } from './CallDetailsDialog';
import { getMonitoredPhoneForCall } from '@/utils/phoneNumberUtils';

export const CallsList = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const { calls, isLoading, error } = useCalls();
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const aircallIntegration = getIntegrationByProvider('aircall');

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Calls</CardTitle>
          <CardDescription>
            Failed to load calls. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Filter calls based on status and direction
  const filteredCalls = calls.filter(call => {
    if (statusFilter !== 'all' && call.status !== statusFilter) return false;
    if (directionFilter !== 'all' && call.direction !== directionFilter) return false;
    return true;
  });

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'ringing':
        return 'warning';
      case 'answered':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? 
      <ArrowDownLeft className="h-4 w-4 text-blue-600" /> : 
      <ArrowUpRight className="h-4 w-4 text-green-600" />;
  };

  const openCallDetails = (call: any) => {
    setSelectedCall(call);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call History</h3>
          <p className="text-sm text-muted-foreground">
            Recent calls and their details
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="ringing">Ringing</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No calls found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== 'all' || directionFilter !== 'all' 
                ? 'Try adjusting your filters to see more calls'
                : 'Call history will appear here'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map((call) => (
            <Card key={call.id} className="transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Direction Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getDirectionIcon(call.direction)}
                    </div>
                    
                    {/* Call Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {formatPhoneNumber(call.customer_phone)}
                        </span>
                        <Badge variant={getStatusColor(call.status) as any}>
                          {call.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(call.started_at), 'MMM d, HH:mm')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(call.duration_seconds)}</span>
                        </div>
                        {call.agent_phone && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{formatPhoneNumber(call.agent_phone)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Show monitored phone number */}
                      {(() => {
                        const monitoredPhone = getMonitoredPhoneForCall(call, aircallIntegration);
                        if (monitoredPhone) {
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 text-xs">
                                <Building2 className="h-3 w-3 text-primary" />
                                <span className="text-primary font-medium">
                                  {monitoredPhone.phoneNumber.label}
                                </span>
                                <span className="text-muted-foreground">
                                  ({monitoredPhone.phoneNumber.number})
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {monitoredPhone.type === 'company' ? 'Company Line' : 'Agent Line'}
                              </Badge>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCallDetails(call)}
                      className="flex items-center gap-2"
                      title="View call details and notes"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call Details Dialog */}
      <CallDetailsDialog
        call={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
};
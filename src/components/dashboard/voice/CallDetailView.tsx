import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  Clock, 
  Calendar, 
  User, 
  ArrowDownLeft, 
  ArrowUpRight,
  MessageSquare,
  Edit,
  Download,
  ExternalLink,
  Activity
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useVoice } from '@/contexts/VoiceContext';
import { useCalls } from '@/hooks/useCalls';
import { CallNotesSection } from './CallNotesSection';
import { CallActionButton } from './CallActionButton';
import { cn } from '@/lib/utils';

interface CallDetailViewProps {
  callId: string;
}

export const CallDetailView: React.FC<CallDetailViewProps> = ({ callId }) => {
  const { state } = useVoice();
  const { calls, activeCalls } = useCalls();
  const [activeTab, setActiveTab] = useState('overview');

  const call = calls?.find(c => c.id === callId) || activeCalls?.find(c => c.id === callId);

  if (!call) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Call not found</h3>
          <p className="text-muted-foreground">
            The requested call could not be found.
          </p>
        </div>
      </div>
    );
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'ringing':
        return 'secondary';
      case 'answered':
        return 'default';
      default:
        return 'outline';
    }
  };

  const isActive = activeCalls.some(activeCall => activeCall.id === call.id);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Call Header */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {call.direction === 'inbound' ? 
                <ArrowDownLeft className="h-5 w-5 text-primary" /> : 
                <ArrowUpRight className="h-5 w-5 text-primary" />
              }
            </div>
            
            <div>
              <h2 className="text-xl font-semibold">
                {formatPhoneNumber(call.customer_phone)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {call.direction === 'inbound' ? 'Incoming call' : 'Outgoing call'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CallActionButton
              phoneNumber={call.customer_phone}
              size="sm"
            />
            
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              View Customer
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(call.status) as any}>
            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
          </Badge>
          
          {isActive && (
            <Badge className="bg-green-100 text-green-800 animate-pulse">
              Live Call
            </Badge>
          )}
          
          <Badge variant="outline">
            {call.provider.charAt(0).toUpperCase() + call.provider.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Call Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Call Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Customer</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPhoneNumber(call.customer_phone)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Agent</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPhoneNumber(call.agent_phone) || 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Started</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(call.started_at), 'PPp')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(call.duration_seconds)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {call.ended_at && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <p>Ended: {format(new Date(call.ended_at), 'PPp')}</p>
                      <p>External ID: {call.external_id}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Call Timeline/Events would go here */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Call Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-muted-foreground">
                        {format(new Date(call.started_at), 'HH:mm:ss')}
                      </span>
                      <span>Call started ({call.direction})</span>
                    </div>
                    
                    {call.ended_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="text-muted-foreground">
                          {format(new Date(call.ended_at), 'HH:mm:ss')}
                        </span>
                        <span>Call ended</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'notes' && (
            <CallNotesSection callId={call.id} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
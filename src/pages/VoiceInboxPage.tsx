import React from 'react';
import { InboxLayout } from '@/components/layout/InboxLayout';
import { ResponsiveGrid, LayoutItem } from '@/components/admin/design/components/layouts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Download, Phone, PhoneCall, PhoneIncoming } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAircallPhone } from '@/hooks/useAircallPhone';

// Mock data for voice calls
const mockVoiceCalls = [
  {
    id: 'call1',
    title: 'Incoming Call - Premium Support',
    subtitle: '+1 (555) 123-4567 • Duration: 4:23 • Customer: Sarah Mitchell',
    status: 'completed' as const,
    priority: 'high' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 1 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'call2',
    title: 'Missed Call - Technical Support',
    subtitle: '+1 (555) 987-6543 • Customer: John Anderson',
    status: 'missed' as const,
    priority: 'urgent' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 30 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'call3',
    title: 'Voicemail - Billing Question',
    subtitle: '+1 (555) 456-7890 • Duration: 2:15 • Customer: Emma Wilson',
    status: 'voicemail' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 3 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'call4',
    title: 'Outbound Call - Follow-up',
    subtitle: '+1 (555) 234-5678 • Duration: 8:45 • Customer: Michael Brown',
    status: 'completed' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 2 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'call5',
    title: 'Conference Call - Enterprise Support',
    subtitle: '+1 (555) 345-6789 • Duration: 12:30 • Multiple participants',
    status: 'completed' as const,
    priority: 'high' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 4 * 60 * 60 * 1000), { addSuffix: true })
  }
];

// Mock call details
const mockCallDetails = {
  'call1': {
    customer: 'Sarah Mitchell',
    phone: '+1 (555) 123-4567',
    duration: '4:23',
    type: 'incoming',
    status: 'completed',
    recording: 'available',
    transcript: 'Hello, I\'m calling about my premium support subscription. I\'ve been experiencing some issues with the advanced features and need assistance setting up the custom integrations.',
    notes: 'Customer resolved integration issues. Provided documentation links and scheduled follow-up.',
    agent: 'Agent: Mike Johnson'
  },
  'call2': {
    customer: 'John Anderson',
    phone: '+1 (555) 987-6543',
    duration: '0:00',
    type: 'incoming',
    status: 'missed',
    recording: 'none',
    transcript: 'No transcript available - call was missed',
    notes: 'Missed call - customer likely needs technical support. Should follow up within 1 hour.',
    agent: 'Unassigned'
  },
  'call3': {
    customer: 'Emma Wilson',
    phone: '+1 (555) 456-7890',
    duration: '2:15',
    type: 'voicemail',
    status: 'voicemail',
    recording: 'available',
    transcript: 'Hi, this is Emma Wilson. I have a question about my recent invoice. There seems to be a discrepancy in the billing amount. Please call me back at your earliest convenience.',
    notes: 'Voicemail regarding billing inquiry. Need to review account and call back.',
    agent: 'Assigned to: Lisa Chen'
  },
  'call4': {
    customer: 'Michael Brown',
    phone: '+1 (555) 234-5678',
    duration: '8:45',
    type: 'outbound',
    status: 'completed',
    recording: 'available',
    transcript: 'Follow-up call regarding previous support ticket. Customer confirmed resolution and provided positive feedback about service quality.',
    notes: 'Successful follow-up. Customer satisfied with resolution. Marked ticket as closed.',
    agent: 'Agent: Sarah Wilson'
  },
  'call5': {
    customer: 'Enterprise Team',
    phone: '+1 (555) 345-6789',
    duration: '12:30',
    type: 'conference',
    status: 'completed',
    recording: 'available',
    transcript: 'Conference call with enterprise client regarding system integration. Discussed implementation timeline, security requirements, and support structure.',
    notes: 'Productive enterprise call. Next steps: Technical architecture review, security audit scheduling.',
    agent: 'Agents: Mike Johnson, Sarah Wilson, Alex Chen'
  }
};

const VoiceInboxPage: React.FC = () => {
  const { isInitialized, isConnected, initializePhone, showAircallWorkspace, hideAircallWorkspace } = useAircallPhone();

  const handleLoadPhone = async () => {
    await initializePhone();
  };

  const handleTogglePhone = () => {
    if (isConnected) {
      showAircallWorkspace();
    }
  };

  const renderDetail = (callId: string) => {
    const call = mockCallDetails[callId as keyof typeof mockCallDetails];
    
    if (!call) {
      return <div className="text-center py-8 text-muted-foreground">Call details not found.</div>;
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'missed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        case 'voicemail': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      }
    };

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'incoming': return <Phone className="h-4 w-4" />;
        case 'outbound': return <PhoneCall className="h-4 w-4" />;
        case 'voicemail': return <Play className="h-4 w-4" />;
        case 'conference': return <Phone className="h-4 w-4" />;
        default: return <Phone className="h-4 w-4" />;
      }
    };

    return (
      <div className="w-full px-4 sm:px-6 md:px-8 xl:px-12">
        <ResponsiveGrid cols={{ sm: '1' }} gap="6">
          {/* Call Overview */}
          <LayoutItem>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(call.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{call.customer}</h3>
                      <p className="text-muted-foreground">{call.phone}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(call.status)}>
                    {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="text-foreground">{call.duration}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-foreground capitalize">{call.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Agent</p>
                    <p className="text-foreground">{call.agent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </LayoutItem>

          {/* Recording & Actions */}
          {call.recording === 'available' && (
            <LayoutItem>
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-foreground">Recording</h4>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Play Recording
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </LayoutItem>
          )}

          {/* Transcript */}
          <LayoutItem>
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-foreground">Transcript</h4>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-foreground leading-relaxed">{call.transcript}</p>
                </div>
              </CardContent>
            </Card>
          </LayoutItem>

          {/* Agent Notes */}
          <LayoutItem>
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-foreground">Agent Notes</h4>
              </CardHeader>
              <CardContent>
                <div className="bg-background border border-border p-4 rounded-lg">
                  <p className="text-foreground leading-relaxed">{call.notes}</p>
                </div>
              </CardContent>
            </Card>
          </LayoutItem>
        </ResponsiveGrid>
      </div>
    );
  };

  const handleReply = (callId: string, message: string) => {
    console.log('Adding note to call:', callId, 'Message:', message);
    // Here you would typically save the note to your backend
  };

  return (
    <div className="relative">
      {/* Aircall Phone System Controls */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
        {!isInitialized ? (
          <Button
            onClick={handleLoadPhone}
            size="lg"
            className="shadow-lg"
          >
            <PhoneIncoming className="h-5 w-5 mr-2" />
            Load Phone System
          </Button>
        ) : isConnected ? (
          <Button
            onClick={handleTogglePhone}
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <Phone className="h-5 w-5" />
          </Button>
        ) : (
          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
            <p className="text-sm text-muted-foreground">Connecting...</p>
          </div>
        )}
      </div>

      <InboxLayout
        conversations={mockVoiceCalls}
        renderDetail={renderDetail}
        title="Voice Inbox"
        onReply={handleReply}
        showReplyBox={true}
      />
    </div>
  );
};

export default VoiceInboxPage;
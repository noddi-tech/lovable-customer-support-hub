import React, { useState, useRef } from 'react';
import { Phone, Play, Pause, Download, FileAudio, Clock, User, AlertCircle, Voicemail as VoicemailIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DynamicAudioPlayer } from '@/components/ui/dynamic-audio-player';
import { useVoicemails, Voicemail } from '@/hooks/useVoicemails';
import { AgentAssignmentSelect } from './AgentAssignmentSelect';
import { CallActionButton } from './CallActionButton';
import { formatDistanceToNow } from 'date-fns';
import { formatPhoneNumber } from '@/utils/phoneNumberUtils';


interface VoicemailCardProps {
  voicemail: any;
  downloadVoicemail: (voicemailId: string) => void;
  getPlaybackUrl: (voicemailId: string) => Promise<any>;
  onAssign: (id: string, agentId: string) => void;
  isDownloading: boolean;
  isAssigning: boolean;
  onSelect?: (voicemail: any) => void;
  isSelected?: boolean;
}

const VoicemailCard = ({ voicemail, downloadVoicemail, getPlaybackUrl, onAssign, isDownloading, isAssigning, onSelect, isSelected }: VoicemailCardProps) => {
  const { t } = useTranslation();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get recording URL from event data
  const recordingUrl = voicemail.event_data?.recording_url;
  const hasValidRecordingUrl = recordingUrl && recordingUrl.length > 0;
  const hasTranscription = !!voicemail.event_data?.transcription;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={(e) => {
        // Only trigger selection if clicking the card, not interactive elements
        if ((e.target as HTMLElement).closest('button, select, audio')) {
          return;
        }
        onSelect?.(voicemail);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileAudio className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {formatPhoneNumber(voicemail.customer_phone || voicemail.calls?.customer_phone)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasValidRecordingUrl && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                Audio
              </Badge>
            )}
            {hasTranscription && (
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Transcribed
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Left {formatDistanceToNow(new Date(voicemail.created_at), { addSuffix: true })}
          {voicemail.event_data?.duration && (
            <span className="ml-2">• {formatDuration(voicemail.event_data.duration)}</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Audio Player */}
        {hasValidRecordingUrl && recordingUrl && (
          <DynamicAudioPlayer 
            initialSrc={recordingUrl} 
            title="Voicemail Recording"
            duration={voicemail.event_data.duration}
            onGetFreshUrl={async () => {
              try {
                return await getPlaybackUrl(voicemail.id);
              } catch (error) {
                console.error('Failed to get playback URL:', error);
                throw error;
              }
            }}
            onDownload={() => {
              downloadVoicemail(voicemail.id);
            }}
          />
        )}

        {/* Transcription */}
        {hasTranscription && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Transcription:</h4>
            <p className="text-sm text-muted-foreground italic">
              "{voicemail.event_data?.transcription}"
            </p>
          </div>
        )}

        {/* Call Details */}
        {voicemail.calls && (
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>
                Call started {formatDistanceToNow(new Date(voicemail.calls.started_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}

        {/* Assignment Section */}
        <div className="border-t pt-3">
          <div className="text-sm text-muted-foreground mb-2">Assignment</div>
          <AgentAssignmentSelect
            currentAssigneeId={voicemail.assigned_to_id}
            onAssign={(agentId) => onAssign(voicemail.id, agentId)}
            isAssigning={isAssigning}
            placeholder="Assign to agent"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <CallActionButton
            phoneNumber={voicemail.customer_phone || voicemail.calls?.customer_phone}
            size="sm"
          />
        </div>

        {!hasValidRecordingUrl && !hasTranscription && (
          <div className="text-center py-4 text-muted-foreground">
            <FileAudio className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recording or transcription available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface VoicemailsListProps {
  statusFilter?: string;
  onSelectVoicemail?: (voicemail: any) => void;
  selectedVoicemailId?: string;
}

export const VoicemailsList: React.FC<VoicemailsListProps> = ({ statusFilter, onSelectVoicemail, selectedVoicemailId }) => {
  const [filter, setFilter] = useState<string>(statusFilter || 'all');
  
  const {
    voicemails,
    recentVoicemails,
    voicemailsWithRecordings,
    transcribedVoicemails,
    isLoading,
    error,
    downloadVoicemail,
    isAudioLoading,
    assignVoicemail,
    isAssigning,
    getPlaybackUrl
  } = useVoicemails();
  
  // Use statusFilter from props or local filter state
  const effectiveFilter = statusFilter || filter;

  // Filter voicemails based on effective filter
  const filteredVoicemails = effectiveFilter === 'all' 
    ? voicemails
    : voicemails?.filter(voicemail => {
        switch (effectiveFilter) {
          case 'pending': return voicemail.status === 'pending';
          case 'assigned': return voicemail.status === 'assigned';
          case 'closed': return voicemail.status === 'closed';
          default: return true;
        }
      }) || [];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Voicemails</CardTitle>
          <CardDescription>
            Failed to load voicemails. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!statusFilter && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Voicemails</h3>
            <p className="text-sm text-muted-foreground">
              Customer voicemail messages
            </p>
          </div>
        </div>
      )}


      {/* Voicemails List */}
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
      ) : filteredVoicemails.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No voicemails yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredVoicemails.map((voicemail: any) => (
            <VoicemailCard
              key={voicemail.id}
              voicemail={voicemail}
              downloadVoicemail={downloadVoicemail}
              getPlaybackUrl={getPlaybackUrl}
              onAssign={(id, agentId) => assignVoicemail({ voicemailId: id, agentId })}
              isDownloading={isAudioLoading}
              isAssigning={isAssigning}
              onSelect={onSelectVoicemail}
              isSelected={selectedVoicemailId === voicemail.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
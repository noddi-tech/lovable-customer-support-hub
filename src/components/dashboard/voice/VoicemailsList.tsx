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


interface VoicemailCardProps {
  voicemail: any;
  downloadVoicemail: (params: { voicemailId: string; recordingUrl: string }) => void;
  getPlaybackUrl: (params: { voicemailId: string; recordingUrl: string }) => Promise<any>;
  onAssign: (id: string, agentId: string) => void;
  isDownloading: boolean;
  isAssigning: boolean;
}

const VoicemailCard = ({ voicemail, downloadVoicemail, getPlaybackUrl, onAssign, isDownloading, isAssigning }: VoicemailCardProps) => {
  const { t } = useTranslation();

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const hasTranscription = !!voicemail.event_data?.transcription;

  // Get the proper signed recording URL
  const getRecordingUrl = () => {
    // First try the signed URL from calls metadata (Aircall provides this)
    if (voicemail.calls?.metadata?.originalPayload?.voicemail) {
      const signedUrl = voicemail.calls.metadata.originalPayload.voicemail;
      console.log('🎵 Using signed URL from calls metadata:', signedUrl.substring(0, 100) + '...');
      
      // Check if URL has expired by looking for X-Amz-Date parameter
      try {
        const url = new URL(signedUrl);
        const amzDate = url.searchParams.get('X-Amz-Date');
        const expires = url.searchParams.get('X-Amz-Expires');
        
        if (amzDate && expires) {
          const signedTime = new Date(amzDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
          const expirationTime = new Date(signedTime.getTime() + parseInt(expires) * 1000);
          const now = new Date();
          
          if (now > expirationTime) {
            console.log('⚠️ Signed URL has expired, using unsigned URL for playback');
            // Fall back to unsigned URL for playback, even if it might not work
            return voicemail.event_data?.recording_url || null;
          }
        }
      } catch (error) {
        console.log('Could not parse URL expiration, proceeding with URL');
      }
      
      return signedUrl;
    }
    
    // Fallback to the unsigned URL from event_data (may not work without authentication)
    if (voicemail.event_data?.recording_url) {
      console.log('⚠️ Using unsigned URL from event_data (may fail):', voicemail.event_data.recording_url);
      return voicemail.event_data.recording_url;
    }
    
    console.log('❌ No recording URL available in voicemail data');
    return null;
  };

  const recordingUrl = getRecordingUrl();
  const hasValidRecordingUrl = !!recordingUrl;

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
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
              console.log('🔄 DynamicAudioPlayer requesting fresh URL...');
              try {
                const result = await getPlaybackUrl({ 
                  voicemailId: voicemail.id, 
                  recordingUrl: voicemail.event_data?.recording_url || '' 
                });
                console.log('🔄 getPlaybackUrl result:', result);
                return result;
              } catch (error) {
                console.error('🔄 getPlaybackUrl failed:', error);
                throw error;
              }
            }}
            onDownload={() => {
              console.log('Download clicked for voicemail:', recordingUrl);
              
              try {
                console.log('Using download function for fresh signed URL...');
                downloadVoicemail({ voicemailId: voicemail.id, recordingUrl: voicemail.event_data?.recording_url || '' });
              } catch (error) {
                console.error('Failed to download recording:', error);
                if (recordingUrl) {
                  window.open(recordingUrl, '_blank', 'noopener,noreferrer');
                }
              }
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
}

export const VoicemailsList: React.FC<VoicemailsListProps> = ({ statusFilter }) => {
  const [filter, setFilter] = useState<string>(statusFilter || 'all');
  
  const {
    voicemails,
    recentVoicemails,
    voicemailsWithRecordings,
    transcribedVoicemails,
    isLoading,
    error,
    downloadVoicemail,
    isDownloading,
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
              isDownloading={isDownloading}
              isAssigning={isAssigning}
            />
          ))}
        </div>
      )}
    </div>
  );
};
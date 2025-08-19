import React, { useState, useRef } from 'react';
import { Phone, Play, Pause, Download, FileAudio, Clock, User, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useVoicemails, Voicemail } from '@/hooks/useVoicemails';
import { formatDistanceToNow } from 'date-fns';

const AudioPlayerSimple = ({ src, duration }: { src: string; duration?: number }) => {
  const handleOpenRecording = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Opening recording:', src);
    
    if (!src) {
      console.error('No recording URL provided');
      alert('No recording URL available');
      return;
    }

    try {
      window.open(src, '_blank', 'noopener,noreferrer');
      console.log('Successfully opened URL in new tab');
    } catch (error) {
      console.error('Failed to open URL:', error);
      alert('Failed to open recording');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown duration';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <FileAudio className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">Voicemail Recording</p>
        <p className="text-xs text-muted-foreground">
          Duration: {formatDuration(duration)}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenRecording}
        className="flex items-center gap-2"
        title="Download/Play recording"
      >
        <Download className="h-3 w-3" />
        Open Recording
      </Button>
    </div>
  );
};

interface VoicemailCardProps {
  voicemail: Voicemail;
  onDownload: (id: string, url: string) => void;
  isDownloading: boolean;
}

const VoicemailCard = ({ voicemail, onDownload, isDownloading }: VoicemailCardProps) => {
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

  const hasRecording = !!voicemail.event_data.recording_url;
  const hasTranscription = !!voicemail.event_data.transcription;

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
            {hasRecording && (
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
          {voicemail.event_data.duration && (
            <span className="ml-2">• {formatDuration(voicemail.event_data.duration)}</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Audio Player */}
        {hasRecording && voicemail.event_data.recording_url && (
          <AudioPlayerSimple 
            src={voicemail.event_data.recording_url} 
            duration={voicemail.event_data.duration}
          />
        )}

        {/* Transcription */}
        {hasTranscription && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Transcription:</h4>
            <p className="text-sm text-muted-foreground italic">
              "{voicemail.event_data.transcription}"
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

        {/* Actions */}
        {hasRecording && voicemail.event_data.recording_url && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Download clicked for voicemail:', voicemail.event_data.recording_url);
                
                if (!voicemail.event_data.recording_url) {
                  console.error('No recording URL available');
                  alert('No recording URL available');
                  return;
                }

                try {
                  window.open(voicemail.event_data.recording_url, '_blank', 'noopener,noreferrer');
                  console.log('Successfully opened recording URL');
                } catch (error) {
                  console.error('Failed to open recording:', error);
                  alert('Failed to open recording');
                }
              }}
              className="flex items-center gap-2"
              title="Download recording"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        )}

        {!hasRecording && !hasTranscription && (
          <div className="text-center py-4 text-muted-foreground">
            <FileAudio className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recording or transcription available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const VoicemailsList = () => {
  const { t } = useTranslation();
  
  const {
    voicemails,
    recentVoicemails,
    voicemailsWithRecordings,
    transcribedVoicemails,
    isLoading,
    error,
    downloadVoicemail,
    isDownloading
  } = useVoicemails();

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voicemails</h3>
          <p className="text-sm text-muted-foreground">
            Customer voicemail messages
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-xl font-bold">{voicemails.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">With Audio</p>
                <p className="text-xl font-bold">{voicemailsWithRecordings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Transcribed</p>
                <p className="text-xl font-bold">{transcribedVoicemails.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm font-medium">Recent</p>
                <p className="text-xl font-bold">{recentVoicemails.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
      ) : voicemails.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No voicemails yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {voicemails.map((voicemail) => (
            <VoicemailCard
              key={voicemail.id}
              voicemail={voicemail}
              onDownload={() => {}} // Not needed with direct download
              isDownloading={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
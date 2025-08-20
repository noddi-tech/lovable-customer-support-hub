import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Download, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface DynamicAudioPlayerProps {
  initialSrc: string;
  title?: string;
  duration?: number;
  className?: string;
  onDownload?: () => void;
  autoPlay?: boolean;
  onGetFreshUrl?: () => Promise<{ localUrl?: string; error?: string; success?: boolean }>;
}

export const DynamicAudioPlayer: React.FC<DynamicAudioPlayerProps> = ({
  initialSrc,
  title = "Audio Recording",
  duration: expectedDuration,
  className,
  onDownload,
  autoPlay = false,
  onGetFreshUrl
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(expectedDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [src, setSrc] = useState(initialSrc);
  const [isGettingFreshUrl, setIsGettingFreshUrl] = useState(false);

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoadingAudio(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoadingAudio(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setHasError(true);
      setIsLoadingAudio(false);
    }
  };

  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Get fresh URL when needed
  const getFreshUrlAndRetry = async () => {
    if (!onGetFreshUrl) return;
    
    try {
      setIsGettingFreshUrl(true);
      setHasError(false);
      console.log('🔄 Getting fresh URL for playback...');
      
      const result = await onGetFreshUrl();
      if (result?.localUrl) {
        console.log('✅ Got fresh URL:', result.localUrl);
        setSrc(result.localUrl);
        setIsLoading(true);
      } else if (result?.error) {
        console.error('❌ Edge function returned error:', result.error);
        throw new Error(result.error || 'Failed to get playback URL');
      }
    } catch (error) {
      console.error('❌ Failed to get fresh URL:', error);
      let errorMessage = 'Failed to get fresh URL';
      
      // Handle specific error messages from the edge function
      if (error.message?.includes('Recording not accessible')) {
        errorMessage = 'Recording URL has expired and cannot be accessed';
      } else if (error.message?.includes('FunctionsHttpError')) {
        errorMessage = 'Server error while processing the recording';
      }
      
      setHasError(true);
      // You might want to show a toast notification here
    } finally {
      setIsGettingFreshUrl(false);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: any) => {
      const audio = audioRef.current;
      let errorMessage = 'Unknown audio error';
      
      if (audio && audio.error) {
        switch (audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio playback was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio file format is not supported or corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported or URL is invalid';
            break;
          default:
            errorMessage = `Audio error code: ${audio.error.code}`;
        }
      }
      
      console.error('🚨 Audio playback error:', {
        errorMessage,
        errorCode: audio?.error?.code,
        audioSrc: src,
        event: e
      });
      
      setHasError(true);
      setIsLoading(false);
      setIsLoadingAudio(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoadingAudio(true);
    };

    const handleCanPlayThrough = () => {
      setIsLoadingAudio(false);
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [src]);

  // Reset state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    setHasError(false);
    setIsLoadingAudio(false);
    
    if (expectedDuration) {
      setDuration(expectedDuration);
    }
  }, [src, expectedDuration]);

  if (hasError) {
    return (
      <div className={cn("flex items-center gap-3 p-4 bg-muted rounded-lg border border-destructive/20", className)}>
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">Failed to load audio</p>
          <p className="text-xs text-muted-foreground">
            The recording URL has expired or is no longer accessible. Try refreshing to get a new URL.
          </p>
        </div>
        {onGetFreshUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={getFreshUrlAndRetry}
            disabled={isGettingFreshUrl}
            className="flex items-center gap-2"
          >
            {isGettingFreshUrl ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCcw className="h-3 w-3" />
            )}
            {isGettingFreshUrl ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 p-4 bg-muted rounded-lg", className)}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        autoPlay={autoPlay}
      />

      {/* Title and duration */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="flex items-center gap-2"
            title="Download recording"
          >
            <Download className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          disabled={isLoading || hasError}
          className="w-full"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          disabled={isLoading || hasError}
          className="flex items-center gap-2"
        >
          {isLoadingAudio ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
        </Button>

        {/* Volume control */}
        <div className="flex items-center gap-2 flex-1">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
};
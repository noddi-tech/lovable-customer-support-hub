import React from 'react';
import { Phone, PhoneCall, Voicemail, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ActionableToastProps {
  type: 'missed_call' | 'voicemail' | 'callback_request' | 'incoming_call';
  phone: string;
  customerName?: string;
  timestamp?: Date;
  onAnswer?: () => void;
  onCallBack?: () => void;
  onSchedule?: () => void;
  onListenNow?: () => void;
  onDismiss?: () => void;
}

export const ActionableToast: React.FC<ActionableToastProps> = ({
  type,
  phone,
  customerName,
  timestamp,
  onAnswer,
  onCallBack,
  onSchedule,
  onListenNow,
  onDismiss,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'missed_call':
        return <Phone className="h-5 w-5 text-destructive" />;
      case 'voicemail':
        return <Voicemail className="h-5 w-5 text-primary" />;
      case 'callback_request':
        return <PhoneCall className="h-5 w-5 text-warning" />;
      case 'incoming_call':
        return <Phone className="h-5 w-5 text-success animate-pulse" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'missed_call':
        return 'Missed Call';
      case 'voicemail':
        return 'New Voicemail';
      case 'callback_request':
        return 'Callback Request';
      case 'incoming_call':
        return 'Incoming Call';
    }
  };

  const getMessage = () => {
    const name = customerName || phone;
    switch (type) {
      case 'missed_call':
        return `You missed a call from ${name}`;
      case 'voicemail':
        return `New voicemail from ${name}`;
      case 'callback_request':
        return `${name} requested a callback`;
      case 'incoming_call':
        return `Call from ${name}`;
    }
  };

  return (
    <div className="flex items-start gap-3 w-full">
      <div className="mt-0.5">{getIcon()}</div>
      
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold">{getTitle()}</p>
          <p className="text-sm text-muted-foreground">{getMessage()}</p>
          {timestamp && (
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="inline h-3 w-3 mr-1" />
              {timestamp.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {type === 'incoming_call' && onAnswer && (
            <Button
              size="sm"
              onClick={onAnswer}
              className="h-7 text-xs bg-success hover:bg-success/90"
            >
              Answer
            </Button>
          )}
          
          {type === 'missed_call' && onCallBack && (
            <Button
              size="sm"
              onClick={onCallBack}
              className="h-7 text-xs"
            >
              <Phone className="h-3 w-3 mr-1" />
              Call Back
            </Button>
          )}
          
          {type === 'voicemail' && onListenNow && (
            <Button
              size="sm"
              onClick={onListenNow}
              className="h-7 text-xs"
            >
              <Voicemail className="h-3 w-3 mr-1" />
              Listen Now
            </Button>
          )}
          
          {(type === 'callback_request' || type === 'missed_call') && onSchedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSchedule}
              className="h-7 text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Schedule
            </Button>
          )}
          
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-7 text-xs ml-auto"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

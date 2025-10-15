import React from 'react';
import { Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AircallConnectionPromptProps {
  onLoadPhone: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner';
  message?: string;
}

export const AircallConnectionPrompt: React.FC<AircallConnectionPromptProps> = ({
  onLoadPhone,
  onDismiss,
  variant = 'banner',
  message = 'Load the Aircall phone system to make and receive calls'
}) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
        <Phone className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <Button onClick={onLoadPhone} size="sm">
          <Phone className="h-4 w-4 mr-2" />
          Load Phone System
        </Button>
      </div>
    );
  }

  return (
    <Alert className="relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <Phone className="h-4 w-4" />
      <AlertTitle>Phone System Not Connected</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <Button onClick={onLoadPhone} size="sm">
          <Phone className="h-4 w-4 mr-2" />
          Load Phone System
        </Button>
      </AlertDescription>
    </Alert>
  );
};

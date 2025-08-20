import React, { useState } from 'react';
import { Phone, ChevronDown, Globe, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface CallActionButtonProps {
  phoneNumber: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export const CallActionButton: React.FC<CallActionButtonProps> = ({
  phoneNumber,
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const normalizePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  };

  const formatPhoneForTel = (phone: string) => {
    const normalized = normalizePhoneNumber(phone);
    // Add + prefix for international format
    return `+1${normalized}`;
  };

  const handleTelCall = () => {
    const telUrl = `tel:${formatPhoneForTel(phoneNumber)}`;
    try {
      window.location.href = telUrl;
      toast({
        title: "Initiating call",
        description: `Opening dialer for ${phoneNumber}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate call",
        variant: "destructive",
      });
    }
    setIsOpen(false);
  };

  const handleAircallCall = () => {
    // Aircall browser extension URL scheme
    const aircallUrl = `aircall://call/${normalizePhoneNumber(phoneNumber)}`;
    try {
      window.location.href = aircallUrl;
      toast({
        title: "Calling via Aircall",
        description: `Initiating call to ${phoneNumber}`,
      });
    } catch (error) {
      // Fallback to tel: if Aircall extension is not available
      handleTelCall();
    }
    setIsOpen(false);
  };

  const handleZoomPhoneCall = () => {
    // Zoom Phone URL scheme
    const zoomUrl = `zoomphone://call?number=${normalizePhoneNumber(phoneNumber)}`;
    try {
      window.location.href = zoomUrl;
      toast({
        title: "Calling via Zoom Phone",
        description: `Initiating call to ${phoneNumber}`,
      });
    } catch (error) {
      // Fallback to tel: if Zoom Phone is not available
      handleTelCall();
    }
    setIsOpen(false);
  };

  if (!phoneNumber || phoneNumber === 'Unknown') {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-1 ${className}`}
        >
          <Phone className="h-3 w-3" />
          Call
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleTelCall} className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <div>
            <div className="font-medium">System Dialer</div>
            <div className="text-xs text-muted-foreground">Use device default</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAircallCall} className="flex items-center gap-2">
          <Puzzle className="h-4 w-4" />
          <div>
            <div className="font-medium">Aircall</div>
            <div className="text-xs text-muted-foreground">Browser extension</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleZoomPhoneCall} className="flex items-center gap-2">
          <Puzzle className="h-4 w-4" />
          <div>
            <div className="font-medium">Zoom Phone</div>
            <div className="text-xs text-muted-foreground">Desktop app</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
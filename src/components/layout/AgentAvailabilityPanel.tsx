import React from 'react';
import { cn } from '@/lib/utils';
import { useAgentAvailability, type AvailabilityStatus } from '@/hooks/useAgentAvailability';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useAircallPhone } from '@/hooks/useAircallPhone';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Circle, ChevronDown, Loader2, Phone, MessageSquare, LogIn, LogOut }  from 'lucide-react';

interface AgentAvailabilityPanelProps {
  collapsed?: boolean;
  className?: string;
}

const chatStatusConfig: Record<AvailabilityStatus, { label: string; color: string; bgColor: string }> = {
  online: { 
    label: 'Online', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500' 
  },
  away: { 
    label: 'Away', 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500' 
  },
  offline: { 
    label: 'Offline', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted-foreground' 
  },
};

// Get initials from a name
const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const AgentAvailabilityPanel: React.FC<AgentAvailabilityPanelProps> = ({ 
  collapsed = false,
  className 
}) => {
  // Chat availability
  const { status: chatStatus, setStatus: setChatStatus, isLoading: chatLoading, isUpdating: chatUpdating } = useAgentAvailability();
  const { data: onlineAgents = [], isLoading: agentsLoading } = useOnlineAgents();
  
  // Phone availability (Aircall)
  const { 
    isConnected: phoneConnected, 
    isInitialized: phoneInitialized,
    initializationPhase,
    openLoginModal,
    initializePhone,
    logout: phoneLogout,
    error: phoneError,
  } = useAircallPhone();
  
  // Check if Aircall is configured
  const { getIntegrationByProvider, isLoading: integrationsLoading } = useVoiceIntegrations();
  const aircallConfig = getIntegrationByProvider('aircall');
  const showPhoneSection = aircallConfig?.is_active && 
    aircallConfig?.configuration?.aircallEverywhere?.enabled;
  
  const currentChatConfig = chatStatusConfig[chatStatus];
  
  // Filter out current user and show only other online agents
  const otherAgents = onlineAgents.filter(a => a.chat_availability === 'online' || a.chat_availability === 'away');

  const handlePhoneLogin = () => {
    console.log('[AgentAvailabilityPanel] Phone login requested');
    
    if (!phoneInitialized) {
      console.log('[AgentAvailabilityPanel] SDK not initialized, initializing first');
      initializePhone();
      return;
    }
    
    openLoginModal();
  };

  const handlePhoneLogout = () => {
    console.log('[AgentAvailabilityPanel] Phone logout requested');
    phoneLogout?.();
    toast.success('Logged out of phone system', {
      description: 'You will not receive phone calls until you log in again',
    });
  };

  // Loading state
  if (chatLoading || integrationsLoading) {
    return (
      <div className={cn(collapsed ? "flex justify-center" : "px-2", className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {!collapsed && <span className="text-sm">Loading...</span>}
        </div>
      </div>
    );
  }

  // Collapsed view - interactive popover with status controls
  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 relative hover:bg-muted"
              title={`Chat: ${chatStatus}${showPhoneSection ? `, Phone: ${phoneConnected ? 'logged in' : 'logged out'}` : ''}`}
            >
              {/* Chat status (primary) */}
              <Circle className={cn("h-4 w-4 fill-current", currentChatConfig.color)} />
              {/* Phone status indicator (small overlay) */}
              {showPhoneSection && (
                <div className={cn(
                  "absolute bottom-1 right-1 h-2 w-2 rounded-full border border-background",
                  phoneConnected ? "bg-green-500" : "bg-muted-foreground"
                )} />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-56 p-3">
            <div className="space-y-3">
              {/* Chat Section */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>Chat</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(Object.entries(chatStatusConfig) as [AvailabilityStatus, typeof currentChatConfig][]).map(
                    ([statusKey, config]) => (
                      <Button
                        key={statusKey}
                        variant={chatStatus === statusKey ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start h-7 text-xs"
                        disabled={chatUpdating}
                        onClick={() => {
                          setChatStatus(statusKey);
                          toast.success(`Chat status: ${config.label}`);
                        }}
                      >
                        <Circle className={cn("h-2 w-2 fill-current mr-1.5", config.color)} />
                        {config.label}
                      </Button>
                    )
                  )}
                </div>
              </div>
              
              {/* Phone Section - only if Aircall configured */}
              {showPhoneSection && (
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>Phone</span>
                  </div>
                  {phoneConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handlePhoneLogout}
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Logout from Aircall
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handlePhoneLogin}
                      disabled={initializationPhase === 'failed'}
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      Login to Aircall
                    </Button>
                  )}
                  {phoneError && (
                    <p className="text-xs text-destructive truncate" title={phoneError}>
                      {phoneError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn("px-3 space-y-4", className)}>
      {/* Section header */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Availability
      </p>
      
      {/* Chat Availability Section */}
      <div className="space-y-2 p-2 rounded-lg bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>Chat</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8"
              disabled={chatUpdating}
            >
              <div className="relative flex-shrink-0">
                <Circle className={cn("h-3 w-3 fill-current", currentChatConfig.color)} />
                {chatStatus === 'online' && (
                  <span className="absolute inset-0 animate-ping">
                    <Circle className="h-3 w-3 fill-current text-green-500 opacity-50" />
                  </span>
                )}
              </div>
              <span className="flex-1 text-left text-sm">
                {currentChatConfig.label}
              </span>
              {chatUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {(Object.entries(chatStatusConfig) as [AvailabilityStatus, typeof currentChatConfig][]).map(
              ([statusKey, config]) => {
                const statusMessages: Record<AvailabilityStatus, { title: string; description: string }> = {
                  online: {
                    title: 'You are now online for chat',
                    description: 'Visitors can start live chats with you'
                  },
                  away: {
                    title: 'Status set to Away',
                    description: 'You will still receive chat notifications'
                  },
                  offline: {
                    title: 'You are now offline',
                    description: 'Live chat is disabled for visitors'
                  }
                };
                
                return (
                  <DropdownMenuItem
                    key={statusKey}
                    onSelect={(e) => {
                      e.preventDefault();
                      setChatStatus(statusKey);
                      toast.success(statusMessages[statusKey].title, {
                        description: statusMessages[statusKey].description,
                      });
                    }}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      chatStatus === statusKey && "bg-muted"
                    )}
                  >
                    <Circle className={cn("h-3 w-3 fill-current", config.color)} />
                    <span>{config.label}</span>
                  </DropdownMenuItem>
                );
              }
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Phone Availability Section - only show if Aircall is configured */}
      {showPhoneSection && (
        <div className="space-y-2 p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>Phone</span>
          </div>
          
          {phoneConnected ? (
            // Logged in state
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <Circle className="h-3 w-3 fill-current text-green-500" />
                  <span className="absolute inset-0 animate-ping">
                    <Circle className="h-3 w-3 fill-current text-green-500 opacity-50" />
                  </span>
                </div>
                <span className="text-sm text-foreground truncate">Logged in</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePhoneLogout}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3 w-3 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
            // Not logged in state
            <Button
              variant="outline"
              size="sm"
              onClick={handlePhoneLogin}
              className="w-full h-8 text-sm justify-center gap-2"
              disabled={initializationPhase === 'failed'}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Login to Aircall</span>
            </Button>
          )}
          
          {/* Phone error state */}
          {phoneError && (
            <p className="text-xs text-destructive truncate" title={phoneError}>
              {phoneError}
            </p>
          )}
        </div>
      )}
      
      {/* Online agents list */}
      {otherAgents.length > 0 && (
        <div className="pt-3 mt-1 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Online now:</p>
          <div className="flex flex-wrap gap-1.5">
            {otherAgents.slice(0, 3).map(agent => (
              <div 
                key={agent.id} 
                className="flex items-center gap-1.5 px-1.5 py-0.5 bg-muted/50 rounded-md"
                title={agent.full_name}
              >
                <Avatar className="h-5 w-5">
                  {agent.avatar_url && (
                    <AvatarImage src={agent.avatar_url} alt={agent.full_name} />
                  )}
                  <AvatarFallback className="text-[9px] bg-primary/10">
                    {getInitials(agent.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground truncate max-w-[60px]">
                  {agent.full_name.split(' ')[0]}
                </span>
                <Circle className={cn(
                  "h-1.5 w-1.5 fill-current shrink-0",
                  agent.chat_availability === 'online' ? 'text-green-500' : 'text-yellow-500'
                )} />
              </div>
            ))}
            {otherAgents.length > 3 && (
              <div className="flex items-center px-1.5 py-0.5 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">
                  +{otherAgents.length - 3} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Empty state when no other agents online */}
      {otherAgents.length === 0 && !agentsLoading && (
        <p className="text-xs text-muted-foreground">
          No other agents online
        </p>
      )}
    </div>
  );
};

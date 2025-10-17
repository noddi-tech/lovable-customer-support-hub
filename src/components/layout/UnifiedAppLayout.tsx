import React, { useState, useMemo } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Search,
  Bell,
  User,
  RefreshCw,
  Filter,
  GitMerge,
  Move,
  CheckCheck,
  Menu
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThreadMerger } from '@/components/dashboard/ThreadMerger';
import { ConversationMigrator } from '@/components/dashboard/ConversationMigrator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppMainNav } from './AppMainNav';
import { UIProbe } from '@/dev/UIProbe';
import { useSearchParams } from 'react-router-dom';

interface UnifiedAppLayoutProps {
  children: React.ReactNode;
}

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({
  children
}) => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // State for dialogs and filters
  const [showMerger, setShowMerger] = useState(false);
  const [showMigrator, setShowMigrator] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get current inbox from URL
  const currentInboxId = searchParams.get('inbox') || 'all';
  
  // Get unread count from conversations (simplified - you may want to use a proper hook)
  const unreadCount = 0; // TODO: Connect to actual unread count
  
  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('inbox_id', currentInboxId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
      toast.success('All conversations marked as read');
      setMobileMenuOpen(false);
    },
    onError: (error) => {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    },
  });

  // (Optional) Keep this only for local dev and only when explicitly enabled
  // React.useEffect(() => {
  //   if (import.meta.env.DEV && import.meta.env.VITE_LAYOUT_DOCTOR === '1') {
  //     const root = document.getElementById('interactions-root') ?? document.body;
  //     const offenders: Element[] = [];
  //     root.querySelectorAll<HTMLElement>('*').forEach(el => {
  //       const cs = getComputedStyle(el);
  //       const mw = parseFloat(cs.maxWidth);
  //       if ((cs.marginLeft === 'auto' && cs.marginRight === 'auto') ||
  //           (!Number.isNaN(mw) && mw > 0 && mw < window.innerWidth - 40)) {
  //         offenders.push(el);
  //       }
  //     });
  //     // eslint-disable-next-line no-console
  //     console.log('Clamp offenders:', offenders.map(e => ({class: e.className, id: e.id})));
  //   }
  // }, []);

  return (
    <SidebarProvider>
      {import.meta.env.DEV && import.meta.env.VITE_UI_PROBE === '1' && <UIProbe />}
      <div className="h-svh flex w-full bg-background">
        {/* Sidebar Navigation */}
        <AppMainNav />

        {/* Main Content Area */}
        <div className="flex-1 grid grid-rows-[56px_1fr] min-h-0">
          {/* Top Header */}
          <header className="bg-muted border-b border-border">
            <div className="flex h-full items-center px-4 shadow-sm">
              <div className="flex items-center gap-4 w-full h-full">
                {/* Sidebar trigger and Logo */}
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="mr-2" />
                  <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-sm">CS</span>
                  </div>
                  <span className="font-semibold text-foreground hidden sm:block">Customer Support Hub</span>
                </div>
                
                {/* Spacer */}
                <div className="flex-1" />

                {/* Desktop: Conversation Management Buttons */}
                <div className="hidden md:flex items-center gap-2">
                  {/* Filters Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Status</label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Priority</label>
                          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="All Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Priority</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Merge Button */}
                  <Button variant="outline" size="sm" onClick={() => setShowMerger(true)}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Merge
                  </Button>

                  {/* Migrate Button */}
                  <Button variant="outline" size="sm" onClick={() => setShowMigrator(true)}>
                    <Move className="h-4 w-4 mr-2" />
                    Migrate
                  </Button>

                  {/* Mark All Read Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                    className="relative"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark Read
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Right side actions */}
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile: Hamburger Menu */}
                <div className="flex md:hidden items-center">
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Actions</SheetTitle>
                      </SheetHeader>
                      
                      <div className="mt-6 space-y-4">
                        {/* Conversation Actions Section */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Conversation Management</p>
                          
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => {
                              setShowMerger(true);
                              setMobileMenuOpen(false);
                            }}
                          >
                            <GitMerge className="h-4 w-4 mr-2" />
                            Merge Threads
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => {
                              setShowMigrator(true);
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Move className="h-4 w-4 mr-2" />
                            Migrate Conversations
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => markAllAsReadMutation.mutate()}
                            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                          >
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark All Read
                            {unreadCount > 0 && (
                              <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-xs">
                                {unreadCount}
                              </Badge>
                            )}
                          </Button>
                        </div>

                        <Separator />

                        {/* Other Actions */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">General</p>
                          
                          <Button variant="outline" className="w-full justify-start">
                            <Search className="h-4 w-4 mr-2" />
                            Search
                          </Button>
                          
                          <Button variant="outline" className="w-full justify-start">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                          
                          <Button variant="outline" className="w-full justify-start">
                            <Bell className="h-4 w-4 mr-2" />
                            Notifications
                          </Button>
                          
                          <Button variant="outline" className="w-full justify-start">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="min-h-0 w-full max-w-none overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Thread Merger Dialog */}
      <Dialog open={showMerger} onOpenChange={setShowMerger}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Merge Split Email Threads</DialogTitle>
          </DialogHeader>
          <ThreadMerger 
            inboxId={currentInboxId}
            onMergeComplete={() => {
              setShowMerger(false);
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Conversation Migrator Dialog */}
      <Dialog open={showMigrator} onOpenChange={setShowMigrator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Migrate Conversations</DialogTitle>
          </DialogHeader>
          <ConversationMigrator 
            sourceInboxId={currentInboxId}
            onMigrationComplete={() => {
              setShowMigrator(false);
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};
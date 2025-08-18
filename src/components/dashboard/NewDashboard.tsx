import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Phone, Plus } from 'lucide-react';
import { InboxSidebar } from '@/components/dashboard/InboxSidebar';
import { NewConversationList } from '@/components/dashboard/NewConversationList';
import { ConversationView } from '@/components/dashboard/ConversationView';
import { useTranslation } from 'react-i18next';
import { Conversation } from '@/services/conversationsService';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';

export function NewDashboard() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedTab, setSelectedTab] = useState('unread');
  const [activeTab, setActiveTab] = useState('text');
  const [selectedInboxId, setSelectedInboxId] = useState<string>('all');
  const queryClient = useQueryClient();

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversationId: conversation.id });
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    // Invalidate conversation queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar - Inbox Navigation */}
      <div className="w-80 border-r border-border bg-background flex flex-col overflow-hidden">
        {/* Inbox Selector */}
        <div className="p-4 border-b border-border">
          <div className="space-y-3">
            <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select inbox" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inboxes</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>
        </div>

        {/* Inbox Sidebar */}
        <div className="flex-1 overflow-y-auto">
          <InboxSidebar 
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
            selectedInboxId={selectedInboxId}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b bg-background px-4 py-2 flex-shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-lg grid-cols-2">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('text')}
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('voice')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'text' ? (
              <NewConversationList 
                selectedConversation={selectedConversation}
                onConversationSelect={handleConversationSelect}
                inboxId={selectedTab === 'all' ? undefined : selectedTab}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Voice interface coming soon
              </div>
            )}
          </div>
        </div>

        {/* Conversation View - Inspector */}
        {selectedConversation && (
          <div className="w-2/5 border-l border-border overflow-hidden">
            <ConversationView
              conversation={selectedConversation}
              onClose={handleCloseConversation}
            />
          </div>
        )}
      </div>
    </div>
  );
}
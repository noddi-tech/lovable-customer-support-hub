import { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { ConversationListItem } from './ConversationListItem';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useTranslation } from 'react-i18next';
import { Clock, Inbox } from 'lucide-react';

interface VirtualizedConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
}

const ITEM_HEIGHT = 80; // Height of each conversation item in pixels
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area for smoother scrolling

const VirtualizedConversationList = memo(({ onSelectConversation, selectedConversation }: VirtualizedConversationListProps) => {
  const { filteredConversations, isLoading } = useConversationList();
  const { t } = useTranslation();

  // Memoize conversations to prevent unnecessary re-renders
  const conversations = useMemo(() => filteredConversations, [filteredConversations]);
  const conversationCount = conversations.length;

  // Check if item is loaded (for infinite loading - future enhancement)
  const isItemLoaded = (index: number) => !!conversations[index];

  // Load more items (placeholder for pagination - future enhancement)
  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    // Placeholder for pagination logic
    console.log(`Loading items ${startIndex} to ${stopIndex}`);
  };

  // Render individual conversation item
  const ConversationItem = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const conversation = conversations[index];
    
    if (!conversation) {
      // Loading skeleton
      return (
        <div style={style} className="px-4 py-3 border-b border-border animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={style}>
        <ConversationListItem
          conversation={conversation}
          isSelected={selectedConversation?.id === conversation.id}
          onSelect={onSelectConversation}
        />
      </div>
    );
  });

  ConversationItem.displayName = 'ConversationItem';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
          <p>{t('dashboard.conversationList.loadingConversations', 'Loading conversations...')}</p>
        </div>
      </div>
    );
  }

  if (conversationCount === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">{t('dashboard.conversationList.noConversations', 'No conversations found')}</p>
          <p className="text-sm">{t('dashboard.conversationList.noConversationsDescription', 'There are no conversations matching your current filters.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      {/* Desktop: Table header */}
      <div className="hidden md:block sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border">
        <div className="row px-4 py-2 text-sm font-medium text-muted-foreground">
          <div className="col--status">Status</div>
          <div className="col--from">From</div>
          <div className="col--subject">Subject</div>
          <div className="col--date">Date</div>
          <div className="flex-shrink-0 w-10"></div>
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1" style={{ height: 'calc(100vh - 200px)' }}>
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={conversationCount}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <List
                  ref={ref}
                  height={height}
                  width={width}
                  itemCount={conversationCount}
                  itemSize={ITEM_HEIGHT}
                  onItemsRendered={onItemsRendered}
                  overscanCount={OVERSCAN_COUNT}
                  className="conversation-list-virtual"
                >
                  {ConversationItem}
                </List>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </div>
    </div>
  );
});

VirtualizedConversationList.displayName = 'VirtualizedConversationList';

export { VirtualizedConversationList };
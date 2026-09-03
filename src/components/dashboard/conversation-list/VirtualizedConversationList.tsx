import { Clock, Inbox } from "lucide-react"
import { memo, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { AutoSizer } from "react-virtualized-auto-sizer"
import { List, type ListProps, type RowComponentProps } from "react-window"
import { useInfiniteLoader } from "react-window-infinite-loader"
import { type Conversation, useConversationList } from "@/contexts/ConversationListContext"
import { ConversationListItem } from "./ConversationListItem"

interface VirtualizedConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
  selectedConversation?: Conversation
}

const ITEM_HEIGHT = 52 // Compressed height for density (48px card + 4px padding)
const OVERSCAN_COUNT = 5 // Number of items to render outside visible area for smoother scrolling

type ConversationRowData = {
  conversations: Conversation[]
  selectedConversation?: Conversation
  onSelectConversation: (conversation: Conversation) => void
}

const ConversationItem = memo(
  ({
    index,
    style,
    conversations,
    selectedConversation,
    onSelectConversation,
  }: RowComponentProps<ConversationRowData>) => {
    const conversation = conversations[index]

    if (!conversation) {
      // Compressed loading skeleton matching single-row layout
      return (
        <div style={style} className="px-3 py-1">
          <div className="bg-white border border-border rounded-lg px-3 py-2 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 bg-muted rounded-full shrink-0"></div>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-4 bg-muted rounded w-32"></div>
                <div className="h-3 bg-muted rounded flex-1 max-w-md"></div>
              </div>
              <div className="flex gap-1.5">
                <div className="h-5 w-12 bg-muted rounded"></div>
                <div className="h-5 w-12 bg-muted rounded"></div>
                <div className="h-5 w-12 bg-muted rounded"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-3 w-16 bg-muted rounded"></div>
                <div className="h-3 w-20 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={style} className="px-3 py-1">
        <ConversationListItem
          conversation={conversation}
          isSelected={selectedConversation?.id === conversation.id}
          onSelect={onSelectConversation}
          isVirtualized={true}
        />
      </div>
    )
  },
)

ConversationItem.displayName = "ConversationItem"

const VirtualizedConversationList = memo(
  ({ onSelectConversation, selectedConversation }: VirtualizedConversationListProps) => {
    const { filteredConversations, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
      useConversationList()
    const { t } = useTranslation()

    // Memoize conversations to prevent unnecessary re-renders
    const conversations = useMemo(() => filteredConversations, [filteredConversations])
    const conversationCount = conversations.length
    const rowCount = hasNextPage ? conversationCount + 1 : conversationCount

    const isRowLoaded = (index: number) => !hasNextPage || index < conversationCount

    // Load more items when scrolling near the end (fetchNextPage is typed as void)
    const loadMoreRows = useCallback(
      (_startIndex: number, _stopIndex: number) => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
        return Promise.resolve()
      },
      [hasNextPage, isFetchingNextPage, fetchNextPage],
    )

    const onRowsRendered = useInfiniteLoader({
      isRowLoaded,
      rowCount,
      loadMoreRows,
    })

    const rowProps = useMemo<ConversationRowData>(
      () => ({
        conversations,
        selectedConversation,
        onSelectConversation,
      }),
      [conversations, selectedConversation, onSelectConversation],
    )

    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>
              {t("dashboard.conversationList.loadingConversations", "Loading conversations...")}
            </p>
          </div>
        </div>
      )
    }

    if (conversationCount === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">
              {t("dashboard.conversationList.noConversations", "No conversations found")}
            </p>
            <p className="text-sm">
              {t(
                "dashboard.conversationList.noConversationsDescription",
                "There are no conversations matching your current filters.",
              )}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex-1 min-h-0">
        {/* Virtualized List - No table headers, using card-based ConversationListItem */}
        <div className="flex-1" style={{ height: "calc(100vh - 200px)" }}>
          <AutoSizer
            renderProp={({ height, width }) => {
              if (height == null || width == null) {
                return null
              }

              return (
                <List
                  style={{ height, width }}
                  rowCount={rowCount}
                  rowHeight={ITEM_HEIGHT}
                  rowComponent={ConversationItem as ListProps<ConversationRowData>["rowComponent"]}
                  rowProps={rowProps}
                  onRowsRendered={onRowsRendered}
                  overscanCount={OVERSCAN_COUNT}
                  className="conversation-list-virtual"
                />
              )
            }}
          />
        </div>
      </div>
    )
  },
)

VirtualizedConversationList.displayName = "VirtualizedConversationList"

export { VirtualizedConversationList }

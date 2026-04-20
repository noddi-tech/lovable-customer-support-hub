import { MessageCard } from "@/components/conversations/MessageCard";
import { ThreadNode } from "@/types/threading";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { noteDebug } from "@/utils/noteInteractionDebug";

interface ThreadedMessagesListProps {
  threadTree: ThreadNode[];
  conversation: any;
  collapsedThreads: Set<string>;
  onToggleThread: (messageId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const ThreadedMessagesList = ({
  threadTree,
  conversation,
  collapsedThreads,
  onToggleThread,
  onEditMessage,
  onDeleteMessage,
}: ThreadedMessagesListProps) => {
  const maxDepth = 3; // Flatten threads deeper than this
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const { deleteNote } = useNoteMutations();
  
  const renderThread = (node: ThreadNode, actualDepth: number = 0) => {
    const isCollapsed = collapsedThreads.has(node.message.id);
    const hasChildren = node.children.length > 0;
    
    // Determine message author type
    const isAgent = node.message.authorType === 'agent' || 
                    node.message.from?.email?.endsWith('@noddi.no') ||
                    node.message.from?.email?.includes('@noddi.tech');
    
    // Calculate visual depth (capped at maxDepth)
    const visualDepth = Math.min(actualDepth, maxDepth);
    const indentWidth = 24; // pixels per level
    const marginLeft = visualDepth * indentWidth;
    
    // Thread line colors based on message type
    const threadLineColor = isAgent ? 'bg-blue-300 dark:bg-blue-700' : 'bg-amber-300 dark:bg-amber-700';
    
    return (
      <div key={node.message.dedupKey || node.message.id}>
        <div 
          className="relative"
          style={{ marginLeft: `${marginLeft}px` }}
        >
          {/* Thread connection lines with type-based colors */}
          {visualDepth > 0 && (
            <>
              {/* Vertical line from parent */}
              <div 
                className={cn("absolute left-0 top-0 bottom-0 w-[2px]", threadLineColor)}
                style={{ left: `-${indentWidth / 2}px` }}
              />
              {/* Horizontal line to message */}
              <div 
                className={cn("absolute top-8 left-0 w-[12px] h-[2px]", threadLineColor)}
                style={{ left: `-${indentWidth / 2}px` }}
              />
            </>
          )}
          
          <div className="px-4 py-3 hover:bg-accent/50 transition-colors rounded-lg">
            <div className="flex gap-2 items-start">
              {/* Collapse/expand button for threads with children */}
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mt-1"
                  onClick={() => onToggleThread(node.message.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <div className="flex-1">
                {/* Reply indicator */}
                {visualDepth > 0 && (
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <span>↳ Reply to previous message</span>
                  </div>
                )}
                
                <MessageCard
                  message={node.message}
                  conversation={conversation}
                  isFirstInThread={actualDepth === 0}
                  defaultCollapsed={false}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onRequestDeleteNote={(id) => setConfirmDeleteNoteId(id)}
                />
                
                {/* Thread count badge */}
                {hasChildren && !isCollapsed && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {node.children.length} {node.children.length === 1 ? 'reply' : 'replies'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Render children if not collapsed */}
        {hasChildren && !isCollapsed && (
          <div>
            {node.children.map(child => renderThread(child, actualDepth + 1))}
          </div>
        )}
        
        {/* Show collapsed count */}
        {hasChildren && isCollapsed && (
          <div 
            className="ml-8 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
            style={{ marginLeft: `${marginLeft + 32}px` }}
            onClick={() => onToggleThread(node.message.id)}
          >
            ... {countDescendants(node)} hidden {countDescendants(node) === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-2">
      {threadTree.map(node => renderThread(node, 0))}

      {/* Hoisted delete-note confirmation — survives MessageCard unmount so Radix can complete focus return */}
      <AlertDialog
        open={!!confirmDeleteNoteId}
        onOpenChange={(open) => {
          noteDebug('delete_dialog_open_changed', { source: 'ThreadedMessagesList', open, messageId: confirmDeleteNoteId }, 'ThreadedMessagesList');
          if (!open) setConfirmDeleteNoteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this internal note?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The note will be removed for everyone in the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const idToDelete = confirmDeleteNoteId;
                noteDebug('delete_confirm_clicked', { source: 'ThreadedMessagesList', messageId: idToDelete }, 'ThreadedMessagesList');
                // 1. Close dialog synchronously so Radix completes its focus return + body unlock
                setConfirmDeleteNoteId(null);
                if (!idToDelete) return;
                // 2. Defer the mutation by one tick so the cache invalidation
                //    (which unmounts the deleted MessageCard) runs AFTER Radix cleanup.
                setTimeout(() => {
                  void deleteNote(idToDelete, conversation?.id);
                }, 0);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Helper to count all descendants
function countDescendants(node: ThreadNode): number {
  return node.children.reduce(
    (count, child) => count + 1 + countDescendants(child),
    0
  );
}

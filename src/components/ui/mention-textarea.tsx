import * as React from 'react';
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamMemberMentions, TeamMemberForMention } from '@/hooks/useTeamMemberMentions';
import { noteDebug } from '@/utils/noteInteractionDebug';

export interface MentionTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  mentionedUserIds?: string[];
  /** Notifies parent when the mention suggestion menu opens or closes */
  onMentionMenuOpenChange?: (open: boolean) => void;
}

interface MentionState {
  isOpen: boolean;
  triggerIndex: number;
  searchQuery: string;
}

const PANEL_WIDTH = 280;
const PANEL_GAP = 4; // px below caret line

const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ className, value, onChange, mentionedUserIds: initialMentionedIds = [], onMentionMenuOpenChange, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mentionState, setMentionState] = useState<MentionState>({
      isOpen: false,
      triggerIndex: -1,
      searchQuery: '',
    });
    const [mentionedUserIds, setMentionedUserIds] = useState<string[]>(initialMentionedIds);
    // Viewport-relative coords for the portaled panel
    const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [activeIndex, setActiveIndex] = useState(0);

    const { members, isLoading, searchMembers } = useTeamMemberMentions();

    // Filter members based on search query
    const filteredMembers = React.useMemo(() => {
      const list = !mentionState.searchQuery ? members : searchMembers(mentionState.searchQuery);
      return list.slice(0, 8);
    }, [members, mentionState.searchQuery, searchMembers]);

    // Reset highlight when query / list changes
    useEffect(() => {
      setActiveIndex(0);
    }, [mentionState.searchQuery, filteredMembers.length]);

    // Notify parent when menu open state changes
    useEffect(() => {
      onMentionMenuOpenChange?.(mentionState.isOpen);
      noteDebug(mentionState.isOpen ? 'mention_menu_opened' : 'mention_menu_closed', {
        query: mentionState.searchQuery,
        resultCount: filteredMembers.length,
      }, 'MentionTextarea');
    }, [mentionState.isOpen, onMentionMenuOpenChange]);

    // Use forwarded ref or internal ref
    const actualRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    // Compute viewport-relative panel position from textarea rect + caret line.
    // Keeps panel inside viewport horizontally.
    const computePanelPosition = useCallback(() => {
      const textarea = actualRef.current;
      // [DIAG] TEMPORARY
      // eslint-disable-next-line no-console
      console.log('[mention-position] running', {
        hasTextareaRef: !!textarea,
        refType: actualRef === textareaRef ? 'internal' : 'forwarded',
        rect: textarea ? textarea.getBoundingClientRect() : null,
        selectionStart: textarea?.selectionStart,
        valueLen: value.length,
      });
      if (!textarea) return;

      const rect = textarea.getBoundingClientRect();
      const { selectionStart } = textarea;
      const textBeforeCaret = value.slice(0, selectionStart);
      const lines = textBeforeCaret.split('\n');
      const currentLine = lines.length - 1;
      const currentColumn = lines[lines.length - 1].length;

      // Approximate caret position inside textarea using line height + char width.
      // These are heuristics matching the previous implementation; good enough
      // for placing the suggestion popover near the caret.
      const lineHeight = 20;
      const charWidth = 8;

      // Account for textarea scroll offset so the panel tracks the visible caret line.
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;

      // Top of the panel = textarea top + caret-line bottom + small gap
      const caretLineBottomInTextarea =
        (currentLine + 1) * lineHeight - scrollTop;
      const top = rect.top + caretLineBottomInTextarea + PANEL_GAP;

      // Left aligned to caret column, clamped to viewport.
      const desiredLeft = rect.left + currentColumn * charWidth - scrollLeft;
      const maxLeft = window.innerWidth - PANEL_WIDTH - 8;
      const left = Math.max(8, Math.min(desiredLeft, maxLeft));

      setPanelPos({ top, left });
    }, [value, actualRef]);

    // Recompute position when menu opens, on scroll, and on resize.
    useLayoutEffect(() => {
      if (!mentionState.isOpen) return;
      computePanelPosition();

      const onScroll = () => computePanelPosition();
      const onResize = () => computePanelPosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
      };
    }, [mentionState.isOpen, computePanelPosition]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;

      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

        if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
          setMentionState({
            isOpen: true,
            triggerIndex: lastAtIndex,
            searchQuery: textAfterAt,
          });
        } else {
          setMentionState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
        }
      } else {
        setMentionState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
      }

      onChange(newValue, mentionedUserIds);
    };

    const handleSelectMember = (member: TeamMemberForMention) => {
      const { triggerIndex, searchQuery } = mentionState;
      const textarea = actualRef.current;
      noteDebug('mention_insert_started', {
        memberId: member.user_id,
        memberName: member.full_name,
        triggerIndex,
        searchQuery,
        selectionStart: textarea?.selectionStart,
        selectionEnd: textarea?.selectionEnd,
      }, 'MentionTextarea');
      if (!textarea) {
        noteDebug('mention_insert_aborted_no_textarea', { memberId: member.user_id }, 'MentionTextarea');
        return;
      }

      const fallbackCursor = triggerIndex + 1 + searchQuery.length;
      const rawCursor = textarea.selectionStart;
      const cursorPosition =
        typeof rawCursor === 'number' && rawCursor >= triggerIndex ? rawCursor : fallbackCursor;
      const beforeMention = value.slice(0, triggerIndex);
      const afterMention = value.slice(cursorPosition);
      const mentionText = `@[${member.full_name}] `;

      const newValue = beforeMention + mentionText + afterMention;

      const newMentionedIds = mentionedUserIds.includes(member.user_id)
        ? mentionedUserIds
        : [...mentionedUserIds, member.user_id];

      setMentionedUserIds(newMentionedIds);
      setMentionState({ isOpen: false, triggerIndex: -1, searchQuery: '' });

      onChange(newValue, newMentionedIds);

      setTimeout(() => {
        const newCursorPos = triggerIndex + mentionText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
        noteDebug('mention_insert_finished', {
          memberId: member.user_id,
          newCursorPos,
          activeElement: document.activeElement?.tagName?.toLowerCase(),
          activeIsTextarea: document.activeElement === textarea,
        }, 'MentionTextarea');
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionState.isOpen && filteredMembers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((i) => (i + 1) % filteredMembers.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const member = filteredMembers[activeIndex] ?? filteredMembers[0];
          if (member) handleSelectMember(member);
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          const member = filteredMembers[activeIndex] ?? filteredMembers[0];
          if (member) handleSelectMember(member);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setMentionState(prev => ({ ...prev, isOpen: false }));
          return;
        }
      }

      props.onKeyDown?.(e);
    };

    return (
      <div className="relative">
        <textarea
          ref={actualRef}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          {...props}
          // ensure our handler wins over any spread onKeyDown
          onKeyDownCapture={undefined}
        />

        {mentionState.isOpen && typeof document !== 'undefined' &&
          createPortal(
            <div
              data-mention-panel="true"
              className="fixed z-[10050] w-[280px] rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
              style={{ top: panelPos.top, left: panelPos.left }}
              // Keep textarea focused when interacting with the panel
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="py-1">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Team Members
                </div>
                {filteredMembers.length === 0 ? (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading team members...' : 'No team members found'}
                  </div>
                ) : (
                  <div className="px-1">
                    {filteredMembers.map((member, index) => (
                      <button
                        key={member.user_id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          // [DIAG] TEMPORARY
                          // eslint-disable-next-line no-console
                          console.log('[mention-item] fired', {
                            type: e.type,
                            index,
                            memberId: member.user_id,
                            memberName: member.full_name,
                            textareaFocused: document.activeElement === actualRef.current,
                            activeEl: (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase(),
                            selectionStart: actualRef.current?.selectionStart,
                            mentionStateIsOpen: mentionState.isOpen,
                            triggerIndex: mentionState.triggerIndex,
                          });
                          e.preventDefault();
                          e.stopPropagation();
                          noteDebug('mention_item_clicked', {
                            memberId: member.user_id,
                            memberName: member.full_name,
                            index,
                          }, 'MentionTextarea');
                          handleSelectMember(member);
                        }}
                        onMouseDownCapture={() => {
                          // [DIAG] TEMPORARY - confirm mousedown reaches the item
                          // eslint-disable-next-line no-console
                          console.log('[mention-item] mousedown-capture', {
                            index, memberId: member.user_id,
                          });
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm text-left",
                          index === activeIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{member.full_name}</span>
                          <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';

export { MentionTextarea };

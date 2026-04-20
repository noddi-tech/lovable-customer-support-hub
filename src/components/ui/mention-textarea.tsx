import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
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

const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ className, value, onChange, mentionedUserIds: initialMentionedIds = [], onMentionMenuOpenChange, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mentionState, setMentionState] = useState<MentionState>({
      isOpen: false,
      triggerIndex: -1,
      searchQuery: '',
    });
    const [mentionedUserIds, setMentionedUserIds] = useState<string[]>(initialMentionedIds);
    const [caretPosition, setCaretPosition] = useState({ top: 0, left: 0 });
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

    // While menu is open, capture outside pointer events to detect what swallows clicks
    useEffect(() => {
      if (!mentionState.isOpen) return;
      const handler = (e: PointerEvent) => {
        const target = e.target as HTMLElement | null;
        const insideTextarea = !!target?.closest('textarea');
        const insidePanel = !!target?.closest('[data-mention-panel="true"]');
        if (insideTextarea || insidePanel) return;
        noteDebug('mention_outside_pointerdown', {
          targetTag: target?.tagName?.toLowerCase(),
          targetClass: typeof target?.className === 'string' ? target.className.slice(0, 80) : '',
          eventType: e.type,
        }, 'MentionTextarea');
      };
      document.addEventListener('pointerdown', handler, true);
      return () => document.removeEventListener('pointerdown', handler, true);
    }, [mentionState.isOpen]);

    // Use forwarded ref or internal ref
    const actualRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    // Calculate caret position for panel placement (relative to textarea wrapper)
    const getCaretCoordinates = useCallback(() => {
      const textarea = actualRef.current;
      if (!textarea) return { top: 0, left: 0 };

      const { selectionStart } = textarea;
      const textBeforeCaret = value.slice(0, selectionStart);
      const lines = textBeforeCaret.split('\n');
      const currentLine = lines.length - 1;
      const currentColumn = lines[lines.length - 1].length;

      const lineHeight = 24;
      const charWidth = 8;

      return {
        top: currentLine * lineHeight + 30,
        left: Math.min(currentColumn * charWidth, Math.max(0, textarea.offsetWidth - 280)),
      };
    }, [value, actualRef]);

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
          setCaretPosition(getCaretCoordinates());
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
          setActiveIndex((i) => {
            const next = (i + 1) % filteredMembers.length;
            noteDebug('mention_arrow_down', { from: i, to: next, count: filteredMembers.length }, 'MentionTextarea');
            return next;
          });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((i) => {
            const next = (i - 1 + filteredMembers.length) % filteredMembers.length;
            noteDebug('mention_arrow_up', { from: i, to: next, count: filteredMembers.length }, 'MentionTextarea');
            return next;
          });
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const member = filteredMembers[activeIndex] ?? filteredMembers[0];
          noteDebug('mention_key_enter', { memberId: member?.user_id, activeIndex }, 'MentionTextarea');
          if (member) handleSelectMember(member);
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          const member = filteredMembers[activeIndex] ?? filteredMembers[0];
          noteDebug('mention_key_tab', { memberId: member?.user_id, activeIndex }, 'MentionTextarea');
          if (member) handleSelectMember(member);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          noteDebug('mention_key_escape', {}, 'MentionTextarea');
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

        {mentionState.isOpen && (
          <div
            data-mention-panel="true"
            className="absolute z-[10050] w-[280px] rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
            style={{ top: caretPosition.top, left: caretPosition.left }}
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
                        noteDebug('mention_item_mouse_down', {
                          memberId: member.user_id,
                          index,
                          activeIndex,
                        }, 'MentionTextarea');
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        noteDebug('mention_item_clicked', {
                          memberId: member.user_id,
                          memberName: member.full_name,
                          index,
                        }, 'MentionTextarea');
                        handleSelectMember(member);
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
          </div>
        )}
      </div>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';

export { MentionTextarea };

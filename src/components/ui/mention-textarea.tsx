import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { useTeamMemberMentions, TeamMemberForMention } from '@/hooks/useTeamMemberMentions';

export interface MentionTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  mentionedUserIds?: string[];
}

interface MentionState {
  isOpen: boolean;
  triggerIndex: number;
  searchQuery: string;
}

const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ className, value, onChange, mentionedUserIds: initialMentionedIds = [], ...props }, ref) => {
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

    // Use forwarded ref or internal ref
    const actualRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    // Calculate caret position for popover placement
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
        left: Math.min(currentColumn * charWidth, textarea.offsetWidth - 200),
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
          setMentionState(prev => ({ ...prev, isOpen: false }));
        }
      } else {
        setMentionState(prev => ({ ...prev, isOpen: false }));
      }

      onChange(newValue, mentionedUserIds);
    };

    const handleSelectMember = (member: TeamMemberForMention) => {
      const { triggerIndex, searchQuery } = mentionState;
      const textarea = actualRef.current;
      if (!textarea) return;

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
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setMentionState(prev => ({ ...prev, isOpen: false }));
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          const member = filteredMembers[activeIndex] ?? filteredMembers[0];
          if (member) handleSelectMember(member);
          return;
        }
      }

      if (mentionState.isOpen && e.key === 'Escape') {
        e.preventDefault();
        setMentionState(prev => ({ ...prev, isOpen: false }));
        return;
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
        />

        <Popover open={mentionState.isOpen} onOpenChange={(open) => !open && setMentionState(prev => ({ ...prev, isOpen: false }))}>
          <PopoverAnchor asChild>
            <div
              className="absolute pointer-events-none"
              style={{ top: caretPosition.top, left: caretPosition.left }}
            />
          </PopoverAnchor>
          <PopoverContent
            className="w-[280px] p-0"
            align="start"
            side="bottom"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              const target = e.target as Node | null;
              if (target && actualRef.current?.contains(target)) {
                e.preventDefault();
              }
            }}
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
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectMember(member)}
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
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';

export { MentionTextarea };

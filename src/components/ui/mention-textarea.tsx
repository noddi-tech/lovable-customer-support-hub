import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
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
    
    const { members, isLoading, searchMembers } = useTeamMemberMentions();
    
    // Filter members based on search query
    const filteredMembers = React.useMemo(() => {
      if (!mentionState.searchQuery) return members;
      return searchMembers(mentionState.searchQuery);
    }, [members, mentionState.searchQuery, searchMembers]);

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

      // Approximate position (you might need to adjust these values)
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
      
      // Find if we're in a mention context (after @ symbol)
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        // Check if there's a space before @ (or it's at the start)
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        
        // Only trigger mention if @ is at start or after whitespace, and no space after @
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
      const { triggerIndex } = mentionState;
      const textarea = actualRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const beforeMention = value.slice(0, triggerIndex);
      const afterMention = value.slice(cursorPosition);
      const mentionText = `@${member.full_name} `;
      
      const newValue = beforeMention + mentionText + afterMention;
      
      // Add user ID to mentioned list if not already present
      const newMentionedIds = mentionedUserIds.includes(member.user_id) 
        ? mentionedUserIds 
        : [...mentionedUserIds, member.user_id];
      
      setMentionedUserIds(newMentionedIds);
      setMentionState({ isOpen: false, triggerIndex: -1, searchQuery: '' });
      
      onChange(newValue, newMentionedIds);
      
      // Set cursor position after the mention
      setTimeout(() => {
        const newCursorPos = triggerIndex + mentionText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionState.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionState(prev => ({ ...prev, isOpen: false }));
        }
        // Let Command handle arrow keys and Enter
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key) && filteredMembers.length > 0) {
          // Don't prevent default for Enter if no members match
        }
      }
      
      props.onKeyDown?.(e);
    };

    // Close popover when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (actualRef.current && !actualRef.current.contains(e.target as Node)) {
          setMentionState(prev => ({ ...prev, isOpen: false }));
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actualRef]);

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
          >
            <Command>
              <CommandList>
                <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                  {isLoading ? 'Loading team members...' : 'No team members found'}
                </CommandEmpty>
                <CommandGroup heading="Team Members">
                  {filteredMembers.slice(0, 8).map((member) => (
                    <CommandItem
                      key={member.user_id}
                      value={member.full_name}
                      onSelect={() => handleSelectMember(member)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{member.full_name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';

export { MentionTextarea };

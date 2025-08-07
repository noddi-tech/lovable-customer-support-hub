import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getEmojiSuggestions, convertShortcodesToEmojis, type EmojiData } from '@/utils/emojiUtils';

interface EmojiAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const EmojiAutocomplete: React.FC<EmojiAutocompleteProps> = ({
  value,
  onChange,
  onKeyDown,
  className = '',
  placeholder,
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<EmojiData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentShortcode, setCurrentShortcode] = useState('');
  const [shortcodeStart, setShortcodeStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect emoji shortcodes in the text
  const detectShortcode = useCallback((text: string, cursorPosition: number) => {
    // Look backwards from cursor position to find the start of a shortcode
    let start = cursorPosition - 1;
    while (start >= 0 && text[start] !== ':' && text[start] !== ' ' && text[start] !== '\n') {
      start--;
    }

    if (start >= 0 && text[start] === ':') {
      const shortcode = text.substring(start, cursorPosition);
      if (shortcode.length > 1) { // At least ":x"
        return { shortcode, start };
      }
    }
    return null;
  }, []);

  // Update suggestions when text changes
  useEffect(() => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart || 0;
    const detection = detectShortcode(value, cursorPosition);

    if (detection) {
      const { shortcode, start } = detection;
      const suggestions = getEmojiSuggestions(shortcode.substring(1)); // Remove the ':'
      
      if (suggestions.length > 0) {
        setSuggestions(suggestions);
        setCurrentShortcode(shortcode);
        setShortcodeStart(start);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, detectShortcode]);

  // Handle emoji selection
  const selectEmoji = useCallback((emoji: EmojiData) => {
    if (shortcodeStart === -1) return;

    const beforeShortcode = value.substring(0, shortcodeStart);
    const afterShortcode = value.substring(shortcodeStart + currentShortcode.length);
    const newValue = beforeShortcode + emoji.emoji + afterShortcode;

    onChange(newValue);
    setShowSuggestions(false);

    // Move cursor after the emoji
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = shortcodeStart + emoji.emoji.length;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, shortcodeStart, currentShortcode, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
          return;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
          return;
        case 'Enter':
          e.preventDefault();
          selectEmoji(suggestions[selectedIndex]);
          return;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          return;
        case 'Tab':
          e.preventDefault();
          selectEmoji(suggestions[selectedIndex]);
          return;
      }
    }

    // Call parent's onKeyDown handler
    onKeyDown?.(e);
  }, [showSuggestions, suggestions, selectedIndex, selectEmoji, onKeyDown]);

  // Handle text change - keep shortcodes visible until selection
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Only convert shortcodes when explicitly completed (space, newline, or selection)
    if (newValue.endsWith(' ') || newValue.endsWith('\n')) {
      const convertedValue = convertShortcodesToEmojis(newValue);
      onChange(convertedValue);
    } else {
      onChange(newValue);
    }
  }, [onChange]);

  // Calculate suggestion popup position
  const getSuggestionPosition = useCallback(() => {
    if (!textareaRef.current || shortcodeStart === -1) return { top: 0, left: 0 };

    const textarea = textareaRef.current;
    const textBeforeShortcode = value.substring(0, shortcodeStart);
    
    // Create a temporary element to measure text dimensions
    const temp = document.createElement('div');
    temp.style.font = getComputedStyle(textarea).font;
    temp.style.whiteSpace = 'pre-wrap';
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.width = `${textarea.clientWidth}px`;
    temp.textContent = textBeforeShortcode;
    document.body.appendChild(temp);

    const rect = textarea.getBoundingClientRect();
    const lines = temp.textContent.split('\n');
    const lastLineLength = lines[lines.length - 1].length;
    
    // Rough estimation of cursor position
    const charWidth = 8; // Average character width
    const lineHeight = 20; // Average line height
    const x = (lastLineLength * charWidth) % textarea.clientWidth;
    const y = (lines.length - 1) * lineHeight;

    document.body.removeChild(temp);

    return {
      top: rect.top + y + lineHeight + window.scrollY,
      left: rect.left + x + window.scrollX
    };
  }, [value, shortcodeStart]);

  const suggestionPosition = getSuggestionPosition();

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg max-w-80"
          style={{
            top: suggestionPosition.top,
            left: suggestionPosition.left,
          }}
        >
          <div className="p-2 border-b border-border">
            <div className="text-xs text-muted-foreground">
              Emoji suggestions for "{currentShortcode}"
            </div>
          </div>
          <ScrollArea className="max-h-60">
            <div className="p-1">
              {suggestions.map((emoji, index) => (
                <Button
                  key={`${emoji.emoji}-${index}`}
                  variant={index === selectedIndex ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto p-2 mb-1"
                  onClick={() => selectEmoji(emoji)}
                >
                  <span className="text-lg mr-2">{emoji.emoji}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{emoji.name}</span>
                    <span className="text-xs text-muted-foreground">{emoji.shortcode}</span>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-border text-xs text-muted-foreground">
            ↑↓ Navigate • Enter/Tab Select • Esc Close
          </div>
        </div>
      )}
    </div>
  );
};
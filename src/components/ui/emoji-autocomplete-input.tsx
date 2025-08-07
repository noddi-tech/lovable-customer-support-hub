import React, { useState, useRef, useCallback } from 'react';

interface EmojiData {
  id: string;
  name: string;
  native: string;
  shortcodes: string;
  keywords: string[];
}

interface EmojiAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Simple emoji database with search functionality
const emojiDatabase = [
  { id: 'blush', name: 'blush', native: '😊', shortcodes: ':blush:', keywords: ['blush', 'shy', 'happy', 'smile'] },
  { id: 'blue_heart', name: 'blue heart', native: '💙', shortcodes: ':blue_heart:', keywords: ['blue', 'heart', 'love'] },
  { id: 'blue_circle', name: 'blue circle', native: '🔵', shortcodes: ':blue_circle:', keywords: ['blue', 'circle', 'round'] },
  { id: 'smile', name: 'smile', native: '😄', shortcodes: ':smile:', keywords: ['smile', 'happy', 'joy'] },
  { id: 'heart', name: 'heart', native: '❤️', shortcodes: ':heart:', keywords: ['heart', 'love', 'red'] },
  { id: 'fire', name: 'fire', native: '🔥', shortcodes: ':fire:', keywords: ['fire', 'hot', 'flame'] },
  { id: 'star', name: 'star', native: '⭐', shortcodes: ':star:', keywords: ['star', 'yellow'] },
  { id: 'thumbs_up', name: 'thumbs up', native: '👍', shortcodes: ':thumbs_up:', keywords: ['thumbs', 'up', 'good', 'yes'] },
  { id: 'party', name: 'party', native: '🎉', shortcodes: ':party:', keywords: ['party', 'celebration', 'confetti'] },
  { id: 'rocket', name: 'rocket', native: '🚀', shortcodes: ':rocket:', keywords: ['rocket', 'space', 'launch'] },
  { id: 'sparkles', name: 'sparkles', native: '✨', shortcodes: ':sparkles:', keywords: ['sparkles', 'stars', 'magic'] },
  { id: 'wink', name: 'wink', native: '😉', shortcodes: ':wink:', keywords: ['wink', 'flirt', 'playful'] },
  { id: 'laugh', name: 'laugh', native: '😂', shortcodes: ':laugh:', keywords: ['laugh', 'funny', 'lol', 'joy'] },
  { id: 'cool', name: 'cool', native: '😎', shortcodes: ':cool:', keywords: ['cool', 'sunglasses', 'awesome'] },
  { id: 'thinking', name: 'thinking', native: '🤔', shortcodes: ':thinking:', keywords: ['thinking', 'hmm', 'wonder'] }
];

export const EmojiAutocompleteInput: React.FC<EmojiAutocompleteInputProps> = ({
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

  // Get emoji suggestions from our database
  const getEmojiSuggestions = useCallback((searchTerm: string): EmojiData[] => {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    const term = searchTerm.toLowerCase();
    const results = emojiDatabase.filter(emoji => {
      return emoji.name.toLowerCase().includes(term) ||
             emoji.keywords.some(keyword => keyword.toLowerCase().includes(term)) ||
             emoji.id.toLowerCase().includes(term);
    });
    
    return results.slice(0, 8);
  }, []);

  // Detect emoji shortcodes in the text
  const detectShortcode = useCallback((text: string, cursorPosition: number) => {
    let start = cursorPosition - 1;
    while (start >= 0 && text[start] !== ':' && text[start] !== ' ' && text[start] !== '\n') {
      start--;
    }

    if (start >= 0 && text[start] === ':') {
      const shortcode = text.substring(start, cursorPosition);
      if (shortcode.length > 1) {
        return { shortcode, start };
      }
    }
    return null;
  }, []);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const cursorPosition = textareaRef.current.selectionStart || 0;
        const detection = detectShortcode(newValue, cursorPosition);
        
        if (detection) {
          const { shortcode, start } = detection;
          const searchTerm = shortcode.substring(1);
          const suggestions = getEmojiSuggestions(searchTerm);
          
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
      }
    });
  }, [onChange, detectShortcode, getEmojiSuggestions]);

  // Handle emoji selection
  const selectEmoji = useCallback((emoji: EmojiData) => {
    if (shortcodeStart === -1) return;

    const beforeShortcode = value.substring(0, shortcodeStart);
    const afterShortcode = value.substring(shortcodeStart + currentShortcode.length);
    const newValue = beforeShortcode + emoji.native + afterShortcode;

    onChange(newValue);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = shortcodeStart + emoji.native.length;
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

    onKeyDown?.(e);
  }, [showSuggestions, suggestions, selectedIndex, selectEmoji, onKeyDown]);

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
          className="absolute z-[9999] bg-card border border-border rounded-md shadow-xl max-w-80 min-w-64 mt-1"
          style={{
            top: '100%',
            left: '0',
          }}
        >
          <div className="p-2 border-b border-border">
            <div className="text-xs text-muted-foreground">
              Emoji suggestions for "{currentShortcode}"
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <div className="p-1">
              {suggestions.map((emoji, index) => (
                <button
                  key={emoji.id}
                  type="button"
                  className={`w-full justify-start text-left h-auto p-2 mb-1 rounded-sm transition-colors flex items-center ${
                    index === selectedIndex 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => selectEmoji(emoji)}
                >
                  <span className="text-lg mr-2">{emoji.native}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{emoji.name}</span>
                    <span className="text-xs text-muted-foreground">{emoji.shortcodes}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="p-2 border-t border-border text-xs text-muted-foreground">
            ↑↓ Navigate • Enter/Tab Select • Esc Close
          </div>
        </div>
      )}
    </div>
  );
};
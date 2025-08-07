import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile, Search } from 'lucide-react';
import { emojiCategories, type EmojiData, getEmojiSuggestions } from '@/utils/emojiUtils';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onEmojiSelect, 
  trigger 
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmojiData[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = getEmojiSuggestions(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Focus search when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderEmojiGrid = (emojis: Array<{ emoji: string; name: string; shortcode: string }>) => (
    <div className="grid grid-cols-8 gap-1 p-2">
      {emojis.map((emoji, index) => (
        <Button
          key={`${emoji.emoji}-${index}`}
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-muted text-lg"
          onClick={() => handleEmojiClick(emoji.emoji)}
          title={`${emoji.name} ${emoji.shortcode}`}
        >
          {emoji.emoji}
        </Button>
      ))}
    </div>
  );

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <Smile className="h-4 w-4" />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="start">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search emojis... (try :smile:)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {searchQuery && searchResults.length > 0 ? (
          <ScrollArea className="h-60">
            <div className="p-2">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Search Results
              </h4>
              {renderEmojiGrid(searchResults)}
            </div>
          </ScrollArea>
        ) : searchQuery && searchResults.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No emojis found for "{searchQuery}"</p>
            <p className="text-xs mt-1">Try searching for :smile: or :heart:</p>
          </div>
        ) : (
          <Tabs defaultValue="Smileys & People" className="w-full">
            <TabsList className="grid w-full grid-cols-5 text-xs h-8">
              <TabsTrigger value="Smileys & People" className="text-xs p-1">
                😀
              </TabsTrigger>
              <TabsTrigger value="Hearts & Symbols" className="text-xs p-1">
                ❤️
              </TabsTrigger>
              <TabsTrigger value="Objects & Tech" className="text-xs p-1">
                📧
              </TabsTrigger>
              <TabsTrigger value="Travel & Places" className="text-xs p-1">
                🚗
              </TabsTrigger>
              <TabsTrigger value="Activities & Events" className="text-xs p-1">
                🎉
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-60">
              {Object.entries(emojiCategories).map(([category, emojis]) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="p-2">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      {category}
                    </h4>
                    {renderEmojiGrid(emojis)}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        )}

        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Tip: Type :smile: in your message for quick emoji shortcuts
        </div>
      </PopoverContent>
    </Popover>
  );
};
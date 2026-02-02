import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { KnowledgeTag } from "./TagManager";

interface TagMultiSelectProps {
  organizationId: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  selectedCategoryId?: string | null;
}

export function TagMultiSelect({
  organizationId,
  selectedTags,
  onChange,
  placeholder = "Select tags...",
  selectedCategoryId,
}: TagMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: tags } = useQuery({
    queryKey: ['knowledge-tags', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_tags')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return data as KnowledgeTag[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  const removeTag = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTags.filter(t => t !== tagName));
  };

  const getTagColor = (tagName: string) => {
    const tag = tags?.find(t => t.name === tagName);
    return tag?.color || '#6B7280';
  };

  // Filter tags based on selected category
  // Show: global tags (category_id is null) + tags matching the selected category
  const filteredTags = tags?.filter(tag => {
    // Always show global tags
    if (!tag.category_id) return true;
    // If a category is selected, also show tags for that category
    if (selectedCategoryId && tag.category_id === selectedCategoryId) return true;
    // If no category is selected, only show global tags
    return false;
  }) || [];

  const availableTags = filteredTags.filter(tag => !selectedTags.includes(tag.name));

  // Separate global tags from category tags in the dropdown
  const globalTags = availableTags.filter(t => !t.category_id);
  const categoryTags = availableTags.filter(t => t.category_id);

  const hasNoCategory = !selectedCategoryId;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "min-h-10 w-full border rounded-md bg-background px-3 py-2 cursor-pointer flex flex-wrap gap-1 items-center",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTags.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedTags.map((tagName) => (
            <Badge
              key={tagName}
              variant="outline"
              className="flex items-center gap-1"
              style={{
                backgroundColor: `${getTagColor(tagName)}20`,
                borderColor: getTagColor(tagName),
                color: getTagColor(tagName),
              }}
            >
              {tagName}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={(e) => removeTag(tagName, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        )}
        <ChevronDown className={cn(
          "ml-auto h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {!tags || tags.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No tags available. Create tags in Settings first.
            </div>
          ) : hasNoCategory && globalTags.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Select a category first to see category-specific tags.
              {globalTags.length === 0 && " No global tags available."}
            </div>
          ) : availableTags.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              All available tags selected.
            </div>
          ) : (
            <div className="p-1">
              {/* Global Tags Section */}
              {globalTags.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Global
                  </div>
                  {globalTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-accent"
                      onClick={() => toggleTag(tag.name)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                  ))}
                </>
              )}
              
              {/* Category-specific Tags Section */}
              {categoryTags.length > 0 && (
                <>
                  {globalTags.length > 0 && <div className="border-t my-1" />}
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Category Tags
                  </div>
                  {categoryTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-accent"
                      onClick={() => toggleTag(tag.name)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

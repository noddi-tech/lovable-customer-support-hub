import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TemplateSelectorProps {
  onSelectTemplate: (content: string, templateId: string) => void;
  isMobile?: boolean;
}

export const TemplateSelector = ({ onSelectTemplate, isMobile }: TemplateSelectorProps) => {
  const { user } = useAuth();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['response-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('response_templates')
        .select('*')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          title="Quick replies"
        >
          <FileText className="h-4 w-4" />
          {!isMobile && <span className="text-xs">Templates</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-popover border border-border shadow-md z-50" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Quick Reply Templates</h4>
            <Badge variant="secondary" className="text-xs">
              {templates?.length || 0}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates && templates.length > 0 ? (
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template.content, template.id)}
                    className="w-full text-left p-3 rounded-md border border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors group"
                  >
                    <div className="font-medium text-sm mb-1 group-hover:text-accent-foreground">
                      {template.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {template.content}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No templates available yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

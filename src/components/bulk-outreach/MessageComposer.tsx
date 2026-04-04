import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MessageComposerProps {
  subject: string;
  onSubjectChange: (s: string) => void;
  messageTemplate: string;
  onMessageChange: (m: string) => void;
  inboxId: string | null;
  onInboxChange: (id: string) => void;
}

export function MessageComposer({
  subject,
  onSubjectChange,
  messageTemplate,
  onMessageChange,
  inboxId,
  onInboxChange,
}: MessageComposerProps) {
  const { data: inboxes } = useQuery({
    queryKey: ["inboxes-for-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inboxes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inbox">Send From Inbox</Label>
        <Select value={inboxId || ""} onValueChange={onInboxChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an inbox" />
          </SelectTrigger>
          <SelectContent>
            {inboxes?.map((inbox) => (
              <SelectItem key={inbox.id} value={inbox.id}>
                {inbox.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Email Subject</Label>
        <Input
          id="subject"
          placeholder="Important update about your appointment"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message Body</Label>
          <Badge variant="secondary" className="text-xs">
            Use {"{name}"} for personalization
          </Badge>
        </div>
        <Textarea
          id="message"
          placeholder={`Hi {name},\n\nWe regret to inform you that...`}
          value={messageTemplate}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={8}
        />
      </div>

      {messageTemplate && (
        <div className="rounded-md border bg-muted/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Preview (first recipient):</p>
          <p className="text-sm whitespace-pre-wrap">
            {messageTemplate.replace(/\{name\}/gi, "Ola Nordmann")}
          </p>
        </div>
      )}
    </div>
  );
}

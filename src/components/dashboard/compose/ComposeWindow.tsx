import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Minus,
  X,
  Maximize2,
  Minimize2,
  Loader2,
  Sparkles,
  Languages,
  Users,
  User,
  Send,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { createConversationAndSend } from '@/lib/createConversation';
import { useCompose, type ComposeDraft } from '@/contexts/ComposeContext';
import { NoddiCustomerSearch } from '@/components/shared/NoddiCustomerSearch';
import { TemplateSelector } from '../conversation-view/TemplateSelector';
import { AiSuggestionDialog } from '../conversation-view/AiSuggestionDialog';

interface InboxData {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

interface NoddiCustomer {
  id: string;
  full_name: string;
  email?: string;
  metadata?: { noddi_email?: string };
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'no', name: 'Norwegian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
];

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .filter((e, i, a) => a.indexOf(e) === i);
}

interface ComposeWindowProps {
  draft: ComposeDraft;
}

/** Gmail-style compose window docked to the bottom of the screen. */
export const ComposeWindow: React.FC<ComposeWindowProps> = ({ draft }) => {
  const { updateDraft, closeWindow, removeDraft, toggleMinimize } = useCompose();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; failed: number } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<NoddiCustomer | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  const handleFilesPicked = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      toast.error(`${tooBig.map((f) => f.name).join(', ')} exceeds the 10MB limit`);
    }
    const ok = picked.filter((f) => f.size <= MAX_FILE_BYTES);
    if (ok.length > 0) setFiles((prev) => [...prev, ...ok]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const formatBytes = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  // AI / translation
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('no');
  const [isTranslating, setIsTranslating] = useState(false);

  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as InboxData[];
    },
  });
  const { data: inboxEmails = {} } = useInboxEmailAddresses();

  // Default inbox once inboxes are known
  React.useEffect(() => {
    if (!draft.inboxId && inboxes.length > 0) {
      const def = inboxes.find((i) => i.is_default) || inboxes[0];
      updateDraft(draft.id, { inboxId: def.id });
    }
  }, [inboxes, draft.inboxId, draft.id, updateDraft]);

  const parsedEmails = useMemo(
    () => (draft.bulkMode ? parseEmails(draft.bulkEmails) : []),
    [draft.bulkMode, draft.bulkEmails],
  );

  const set = useCallback(
    (patch: Partial<ComposeDraft>) => updateDraft(draft.id, patch),
    [draft.id, updateDraft],
  );

  const handleCustomerSelect = (customer: NoddiCustomer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      set({
        to: customer.email || customer.metadata?.noddi_email || '',
        toName: customer.full_name,
      });
    }
  };

  const handleGetAiSuggestions = async () => {
    if (!draft.subject.trim()) {
      toast.error('Please enter a subject first');
      return;
    }
    setIsLoadingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email-reply', {
        body: {
          customerMessage: draft.subject,
          conversationContext: `Creating new conversation about: ${draft.subject}`,
        },
      });
      if (error) throw error;
      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
        toast.success('AI suggestions generated');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleRefine = async (instructions: string) => {
    if (!selectedSuggestion) return;
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email-reply', {
        body: {
          customerMessage: draft.subject,
          conversationContext: `Refine this message: ${selectedSuggestion}`,
          refinementInstructions: instructions,
        },
      });
      if (error) throw error;
      if (data?.refinedText) {
        setSelectedSuggestion(data.refinedText);
        toast.success('Suggestion refined');
      }
    } catch (error) {
      console.error('Error refining suggestion:', error);
      toast.error('Failed to refine suggestion');
    } finally {
      setIsRefining(false);
    }
  };

  const handleTranslate = async () => {
    if (!draft.body.trim()) {
      toast.error('Please enter a message first');
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text: draft.body, sourceLanguage, targetLanguage },
      });
      if (error) throw error;
      if (data?.translatedText) {
        set({ body: data.translatedText });
        toast.success('Message translated');
      }
    } catch (error) {
      console.error('Error translating text:', error);
      toast.error('Failed to translate text');
    } finally {
      setIsTranslating(false);
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
  };

  const goToInbox = (conversationId?: string) => {
    const currentParams = new URLSearchParams(window.location.search);
    const currentInbox = currentParams.get('inbox') || draft.inboxId;
    const basePath = window.location.pathname.includes('/interactions')
      ? window.location.pathname
      : '/interactions/text/open';
    navigate(`${basePath}?inbox=${currentInbox}${conversationId ? `&c=${conversationId}` : ''}`);
  };

  const handleSend = async () => {
    if (!draft.inboxId) {
      toast.error('Please select an inbox');
      return;
    }
    if (!draft.subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (draft.bulkMode) {
      if (parsedEmails.length === 0) {
        toast.error('Add at least one valid email');
        return;
      }
      setBulkProgress({ current: 0, total: parsedEmails.length, failed: 0 });
      let failed = 0;
      for (let i = 0; i < parsedEmails.length; i++) {
        const email = parsedEmails[i];
        try {
          await createConversationAndSend({
            customerEmail: email,
            customerName: email.split('@')[0],
            subject: draft.subject.trim(),
            initialMessage: draft.body.trim().replace(/\{email\}/gi, email),
            inboxId: draft.inboxId,
            priority: draft.priority,
            organizationId: profile?.organization_id,
            senderProfileUserId: profile?.user_id,
            files,
          });
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error);
          failed++;
        }
        setBulkProgress({ current: i + 1, total: parsedEmails.length, failed });
      }
      const sent = parsedEmails.length - failed;
      if (failed === 0) toast.success(`Successfully sent ${sent} emails`);
      else toast.warning(`Sent ${sent} emails, ${failed} failed`);
      setBulkProgress(null);
      invalidate();
      removeDraft(draft.id);
      goToInbox();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.to.trim())) {
      toast.error('A valid recipient email is required');
      return;
    }

    setSending(true);
    try {
      const result = await createConversationAndSend({
        customerEmail: draft.to.trim(),
        customerName: draft.toName.trim() || draft.to.split('@')[0],
        subject: draft.subject.trim(),
        initialMessage: draft.body.trim(),
        inboxId: draft.inboxId,
        priority: draft.priority,
        organizationId: profile?.organization_id,
        senderProfileUserId: profile?.user_id,
        files,
      });

      if (result.emailError) toast.warning(`Conversation created, but: ${result.emailError}`);
      else toast.success('Email sent');

      invalidate();
      removeDraft(draft.id);
      goToInbox(result.conversationId);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setSending(false);
    }
  };

  const busy = sending || !!bulkProgress;
  const title =
    draft.subject.trim() ||
    (draft.bulkMode
      ? `${parsedEmails.length} recipients`
      : draft.toName.trim() || draft.to.trim() || 'New email');

  /* ---------------- Minimized bar ---------------- */
  if (draft.minimized) {
    return (
      <div className="w-64 rounded-t-lg border border-border bg-card text-card-foreground shadow-lg" style={{ backgroundColor: 'hsl(var(--card))' }}>
        <div className="flex items-center gap-1 px-3 py-2">
          <button
            type="button"
            className="flex-1 min-w-0 text-left text-sm font-medium truncate"
            onClick={() => toggleMinimize(draft.id)}
          >
            {title}
          </button>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => closeWindow(draft.id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Full window ---------------- */
  return (
    <div
      className={cn(
        'flex flex-col rounded-t-lg border border-border shadow-2xl overflow-hidden isolate',
        'bg-card text-card-foreground opacity-100 backdrop-blur-none',
        expanded
          ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vh] rounded-lg'
          : 'w-[min(96vw,520px)] h-[560px] max-h-[80vh]',
      )}
      style={{ backgroundColor: 'hsl(var(--card))' }}
    >

      {/* Header */}
      <div className="flex items-center gap-1 bg-muted px-3 py-2 border-b border-border">
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{title}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleMinimize(draft.id)} title="Minimize">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Restore' : 'Expand'}
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => closeWindow(draft.id)}
          disabled={busy}
          title="Save as draft & close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Fields */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* From (inbox) */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-sm">
          <span className="text-muted-foreground w-14 shrink-0">From</span>
          <Select value={draft.inboxId} onValueChange={(v) => set({ inboxId: v })} disabled={busy}>
            <SelectTrigger className="h-7 border-0 shadow-none focus:ring-0 px-0 text-sm">
              <SelectValue placeholder={t('conversation.selectInbox')} />
            </SelectTrigger>
            <SelectContent>
              {inboxes.map((inbox) => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: inbox.color }} />
                    <span className="truncate">{inbox.name}</span>
                    {inboxEmails[inbox.id] && (
                      <span className="text-xs text-muted-foreground truncate">({inboxEmails[inbox.id]})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* To */}
        <div className="px-3 py-1.5 border-b border-border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-14 shrink-0">To</span>
            {draft.bulkMode ? (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Badge variant="secondary">{parsedEmails.length} recipients</Badge>
              </div>
            ) : (
              <Input
                value={draft.to}
                onChange={(e) => set({ to: e.target.value })}
                placeholder="customer@example.com"
                type="email"
                disabled={busy}
                className="h-7 border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
              />
            )}
            <div className="flex items-center gap-1 shrink-0">
              <Label htmlFor={`bulk-${draft.id}`} className="text-xs font-normal text-muted-foreground cursor-pointer">
                {draft.bulkMode ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </Label>
              <Switch
                id={`bulk-${draft.id}`}
                checked={draft.bulkMode}
                onCheckedChange={(v) => set({ bulkMode: v })}
                disabled={busy}
              />
            </div>
          </div>
          {draft.bulkMode && (
            <Textarea
              value={draft.bulkEmails}
              onChange={(e) => set({ bulkEmails: e.target.value })}
              placeholder={'customer1@example.com\ncustomer2@example.com'}
              disabled={busy}
              className="mt-2 min-h-[72px] resize-none font-mono text-xs"
              emojiAutocomplete={false}
            />
          )}
        </div>

        {/* Customer lookup */}
        {!draft.bulkMode && profile?.organization_id && (
          <div className="px-3 py-2 border-b border-border">
            <NoddiCustomerSearch
              selectedCustomer={selectedCustomer as any}
              onSelectCustomer={handleCustomerSelect as any}
              organizationId={profile.organization_id}
              showEmailSearch={false}
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
          <Input
            value={draft.subject}
            onChange={(e) => set({ subject: e.target.value })}
            placeholder="Subject"
            disabled={busy}
            className="h-7 border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
          />
          <Select value={draft.priority} onValueChange={(v) => set({ priority: v })} disabled={busy}>
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('conversation.low')}</SelectItem>
              <SelectItem value="normal">{t('conversation.normal')}</SelectItem>
              <SelectItem value="high">{t('conversation.high')}</SelectItem>
              <SelectItem value="urgent">{t('conversation.urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 px-3 py-2">
          <Textarea
            value={draft.body}
            onChange={(e) => set({ body: e.target.value })}
            placeholder={t('conversation.initialMessagePlaceholder')}
            disabled={busy}
            className="h-full min-h-0 resize-none border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
          />
        </div>

        {files.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {files.map((file, index) => (
              <Badge key={`${file.name}-${index}`} variant="secondary" className="gap-1 max-w-full">
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[160px]">{file.name}</span>
                <span className="text-muted-foreground text-[10px]">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={busy}
                  className="ml-0.5 hover:text-destructive"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {bulkProgress && (
          <div className="px-3 pb-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending {bulkProgress.current}/{bulkProgress.total}...
              </span>
              {bulkProgress.failed > 0 && (
                <span className="text-destructive">{bulkProgress.failed} failed</span>
              )}
            </div>
            <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
        <Button onClick={handleSend} disabled={busy || !draft.subject.trim()} size="sm" className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {draft.bulkMode ? `Send (${parsedEmails.length})` : 'Send'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesPicked(e.target.files)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title="Attach files"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleGetAiSuggestions}
              disabled={isLoadingAi || !draft.subject.trim()}
              title="AI suggestions"
            >
              {isLoadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </PopoverTrigger>
          {aiSuggestions.length > 0 && (
            <PopoverContent className="w-96 max-h-96 overflow-y-auto" side="top">
              <div className="space-y-2">
                <p className="text-sm font-medium">AI Suggestions</p>
                {aiSuggestions.map((suggestion, index) => (
                  <Card
                    key={index}
                    className="p-3 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      setSelectedSuggestion(suggestion);
                      setShowAiDialog(true);
                    }}
                  >
                    <p className="text-sm line-clamp-3">{suggestion}</p>
                  </Card>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!draft.body.trim()}
              title="Translate"
            >
              <Languages className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" side="top">
            <div className="space-y-3">
              <p className="text-sm font-medium">Translate Message</p>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleTranslate} disabled={isTranslating} className="w-full" size="sm">
                {isTranslating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Translate
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <TemplateSelector onSelectTemplate={(content: string) => set({ body: content })} isMobile={false} />

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => removeDraft(draft.id)}
          disabled={busy}
          title="Discard draft"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AiSuggestionDialog
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        suggestion={selectedSuggestion || ''}
        onUseAsIs={() => {
          if (selectedSuggestion) {
            set({ body: selectedSuggestion });
            setShowAiDialog(false);
            toast.success('Suggestion inserted');
          }
        }}
        onRefine={handleRefine}
        isRefining={isRefining}
      />
    </div>
  );
};

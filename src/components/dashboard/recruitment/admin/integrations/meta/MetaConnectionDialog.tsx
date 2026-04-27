import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Copy, Eye, EyeOff, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMetaIntegration } from '../hooks/useMetaIntegration';
import type { MetaIntegration } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: MetaIntegration | null;
  initialMode?: 'edit' | 'view';
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/meta-lead-webhook`;

export function MetaConnectionDialog({ open, onOpenChange, integration, initialMode = 'edit' }: Props) {
  const { toast } = useToast();
  const { createIntegration, updateIntegration, regenerateVerifyToken } = useMetaIntegration();

  const [pageName, setPageName] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPageName(integration?.page_name ?? '');
      setPageId(integration?.page_id ?? '');
      setPageAccessToken(integration?.page_access_token ?? '');
      setShowToken(false);
      setShowInstructions(false);
    }
  }, [open, integration]);

  const isEditing = !!integration;
  const isReadOnly = isEditing && initialMode === 'view';

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast({ title: 'Kunne ikke kopiere', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!pageName.trim() || !pageId.trim()) {
      toast({ title: 'Page name og Page ID er påkrevd', variant: 'destructive' });
      return;
    }
    if (!/^\d+$/.test(pageId.trim())) {
      toast({ title: 'Page ID må være numerisk', variant: 'destructive' });
      return;
    }
    try {
      if (integration) {
        await updateIntegration.mutateAsync({
          id: integration.id,
          page_name: pageName.trim(),
          page_id: pageId.trim(),
          page_access_token: pageAccessToken.trim() || null,
        });
        toast({ title: 'Meta-integrasjon oppdatert' });
      } else {
        await createIntegration.mutateAsync({
          page_name: pageName.trim(),
          page_id: pageId.trim(),
          page_access_token: pageAccessToken.trim() || null,
        });
        toast({ title: 'Meta-integrasjon opprettet' });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Lagring feilet', description: e?.message, variant: 'destructive' });
    }
  };

  const handleRegenerate = async () => {
    if (!integration) return;
    try {
      await regenerateVerifyToken.mutateAsync(integration.id);
      toast({ title: 'Nytt verify token generert' });
    } catch (e: any) {
      toast({ title: 'Regenerering feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Meta Lead Ads-tilkobling' : 'Koble til Meta-side'}</SheetTitle>
          <SheetDescription>
            Konfigurer Meta-side, webhook og verify token. Lim inn webhook URL og verify token i Meta Developer Portal.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meta-page-name">Page name</Label>
            <Input
              id="meta-page-name"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="Noddi"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-page-id">Page ID</Label>
            <Input
              id="meta-page-id"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="123456789012345"
              inputMode="numeric"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-token">Page access token</Label>
            <div className="flex gap-2">
              <Input
                id="meta-token"
                type={showToken ? 'text' : 'password'}
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
                placeholder="EAAB..."
                disabled={isReadOnly}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken((v) => !v)}
                aria-label={showToken ? 'Skjul token' : 'Vis token'}
              >
                {showToken ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Hentes fra Meta Developer Portal → Page → Generate token. Lagres kryptert via RLS.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(WEBHOOK_URL, 'url')}
                aria-label="Kopier webhook URL"
              >
                {copiedField === 'url' ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Verify token</Label>
            {integration ? (
              <div className="flex gap-2">
                <Input value={integration.verify_token} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(integration.verify_token, 'token')}
                  aria-label="Kopier verify token"
                >
                  {copiedField === 'token' ? <Check /> : <Copy />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRegenerate}
                  disabled={regenerateVerifyToken.isPending}
                  aria-label="Regenerer verify token"
                >
                  <RefreshCw />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Genereres automatisk når integrasjonen lagres.
              </p>
            )}
          </div>

          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                Oppsettsveiledning (Meta Developer Portal)
                <ChevronDown className={showInstructions ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Gå til <span className="font-medium">Meta for Developers → Apps → Din app → Webhooks</span>.</li>
                <li>Velg <span className="font-medium">Page</span> → <span className="font-medium">Subscribe</span>.</li>
                <li>Lim inn webhook URL og verify token over.</li>
                <li>Velg <span className="font-medium">leadgen</span> som event.</li>
                <li>Lagre Page Access Token i feltet over.</li>
                <li>Webhook-mottaket aktiveres når Phase C edge function er publisert.</li>
              </ol>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Lukk
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={createIntegration.isPending || updateIntegration.isPending}
            >
              {isEditing ? 'Lagre endringer' : 'Opprett tilkobling'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Facebook, Loader2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useStartMetaOAuth,
  useMetaPageList,
  type MetaPageOption,
} from '../../hooks/useMetaOAuth';
import { useMetaIntegration } from '../../hooks/useMetaIntegration';
import type { MetaIntegration } from '../../types';

interface Props {
  mode: 'create' | 'reconnect';
  existingIntegrationId: string | null;
  stateId: string | null; // present after returning from FB
  onPickedOAuth: (selection: {
    state_id: string;
    page_id: string;
    page_name: string;
    granted_scopes: string[];
  }) => void;
  onPickedManual: (integration: MetaIntegration) => void;
  onBack: () => void;
}

export function Step2SelectPage({
  mode,
  existingIntegrationId,
  stateId,
  onPickedOAuth,
  onPickedManual,
  onBack,
}: Props) {
  const { toast } = useToast();
  const start = useStartMetaOAuth();
  const pageList = useMetaPageList(stateId);
  const { createIntegration, updateIntegration } = useMetaIntegration();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // Manual form
  const [manualPageId, setManualPageId] = useState('');
  const [manualPageName, setManualPageName] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);

  useEffect(() => {
    if (pageList.error) {
      toast({
        title: 'Kunne ikke hente sider',
        description: (pageList.error as any)?.message ?? 'Prøv igjen',
        variant: 'destructive',
      });
    }
  }, [pageList.error, toast]);

  const handleStartOAuth = async () => {
    try {
      await start.mutateAsync({ mode, existing_integration_id: existingIntegrationId });
      // Browser navigates away; nothing else to do.
    } catch (e: any) {
      toast({
        title: 'Kunne ikke starte tilkobling',
        description: e?.message,
        variant: 'destructive',
      });
    }
  };

  const handleConfirmPage = () => {
    if (!stateId || !pageList.data || !selectedPageId) return;
    const page = pageList.data.pages.find((p) => p.id === selectedPageId);
    if (!page) return;
    onPickedOAuth({
      state_id: stateId,
      page_id: page.id,
      page_name: page.name,
      granted_scopes: pageList.data.granted_scopes,
    });
  };

  const handleManualSave = async () => {
    if (!manualPageId.trim() || !manualPageName.trim() || !manualToken.trim()) {
      toast({ title: 'Fyll inn alle feltene', variant: 'destructive' });
      return;
    }
    setManualBusy(true);
    try {
      let integration: MetaIntegration;
      if (mode === 'reconnect' && existingIntegrationId) {
        integration = await updateIntegration.mutateAsync({
          id: existingIntegrationId,
          page_id: manualPageId.trim(),
          page_name: manualPageName.trim(),
          page_access_token: manualToken.trim(),
          status: 'configured',
          status_message: null,
        });
      } else {
        integration = await createIntegration.mutateAsync({
          page_id: manualPageId.trim(),
          page_name: manualPageName.trim(),
          page_access_token: manualToken.trim(),
        });
      }
      onPickedManual(integration);
    } catch (e: any) {
      toast({
        title: 'Kunne ikke lagre tilkobling',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setManualBusy(false);
    }
  };

  const oauthArrived = !!stateId;

  return (
    <Tabs defaultValue={oauthArrived ? 'oauth' : 'oauth'} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="oauth">Med Facebook (anbefalt)</TabsTrigger>
        <TabsTrigger value="manual">Manuell (avansert)</TabsTrigger>
      </TabsList>

      {/* === OAuth tab === */}
      <TabsContent value="oauth" className="space-y-4">
        {!oauthArrived && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Vi sender deg til Facebook for å logge inn og velge hvilken side du vil koble til.
              Du blir sendt rett tilbake hit.
            </p>
            <Button onClick={handleStartOAuth} disabled={start.isPending}>
              {start.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Facebook className="h-4 w-4 mr-2" />
              )}
              Koble til med Facebook
            </Button>
          </div>
        )}

        {oauthArrived && pageList.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {oauthArrived && pageList.data && pageList.data.pages.length === 0 && (
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700">Ingen sider funnet</AlertTitle>
            <AlertDescription className="text-xs space-y-3">
              <p>
                Vi fant ingen Facebook-sider knyttet til kontoen din. Sjekk at du er
                administrator for siden i Meta Business Suite.
              </p>
              <Button size="sm" variant="outline" onClick={handleStartOAuth} disabled={start.isPending}>
                {start.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Prøv igjen
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {oauthArrived && pageList.data && pageList.data.pages.length > 0 && (
          <div className="space-y-2">
            {pageList.data.oauth_user_name && (
              <p className="text-xs text-muted-foreground">
                Logget inn som <span className="font-medium">{pageList.data.oauth_user_name}</span>
              </p>
            )}
            <div className="space-y-1.5">
              {pageList.data.pages.map((p: MetaPageOption) => (
                <label
                  key={p.id}
                  className={
                    'flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ' +
                    (selectedPageId === p.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50')
                  }
                >
                  <input
                    type="radio"
                    name="meta-page"
                    className="h-4 w-4"
                    checked={selectedPageId === p.id}
                    onChange={() => setSelectedPageId(p.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name || '(uten navn)'}</div>
                    <div className="text-xs text-muted-foreground font-mono">ID: {p.id}</div>
                  </div>
                  {!p.can_manage && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
                      Begrenset rolle
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* === Manual tab === */}
      <TabsContent value="manual" className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Bruk denne hvis du allerede har et Page Access Token fra Graph Explorer eller en System User.
          Du må fortsatt være administrator av siden.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Sidenavn</Label>
            <Input
              value={manualPageName}
              onChange={(e) => setManualPageName(e.target.value)}
              placeholder="Noddi"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Side-ID</Label>
            <Input
              value={manualPageId}
              onChange={(e) => setManualPageId(e.target.value)}
              placeholder="123456789012345"
              className="font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Page Access Token</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowToken((v) => !v)}
            >
              {showToken ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {showToken ? 'Skjul' : 'Vis'}
            </Button>
          </div>
          <Textarea
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="EAAB..."
            className={'font-mono text-xs min-h-[100px] ' + (showToken ? '' : 'text-security-disc')}
            style={!showToken ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
          />
        </div>
      </TabsContent>

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={start.isPending || manualBusy}>
          Tilbake
        </Button>
        <div className="flex gap-2">
          {oauthArrived ? (
            <Button onClick={handleConfirmPage} disabled={!selectedPageId}>
              Fortsett
            </Button>
          ) : (
            <Button onClick={handleManualSave} disabled={manualBusy}>
              {manualBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lagre og fortsett
            </Button>
          )}
        </div>
      </div>
    </Tabs>
  );
}

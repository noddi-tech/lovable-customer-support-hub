import React, { useEffect, useState } from 'react';
import { Rocket, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SUPABASE_URL = 'https://qgfaycwsangsqzpveoup.supabase.co';
const WIDGET_SCRIPT_URL = `${SUPABASE_URL}/storage/v1/object/public/widget/widget.js`;

interface LiveBuild {
  publishedAt: string;
  commit: string;
  size?: number;
}

interface WidgetDeployPanelProps {
  /** 'banner' = compact always-visible call to action, 'full' = includes detailed guidance */
  variant?: 'banner' | 'full';
}

export const WidgetDeployPanel: React.FC<WidgetDeployPanelProps> = ({ variant = 'banner' }) => {
  const [deploying, setDeploying] = useState(false);
  const [liveBuild, setLiveBuild] = useState<LiveBuild | null>(null);
  const [lastDeploy, setLastDeploy] = useState<{ size: number | null; at: string } | null>(null);

  const appCommit = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'unknown';

  const fetchLiveBuild = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/public/widget/widget-build.json?t=${Date.now()}`,
      );
      if (!res.ok) return;
      setLiveBuild(await res.json());
    } catch {
      // manifest not published yet
    }
  };

  useEffect(() => {
    fetchLiveBuild();
  }, []);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/deploy-widget?action=deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit: appCommit }),
      });

      if (!response.ok) throw new Error('Deploy failed');

      const result = await response.json();
      setLastDeploy({ size: result.size ?? null, at: new Date().toLocaleString() });
      if (result.publishedAt) {
        setLiveBuild({ publishedAt: result.publishedAt, commit: result.commit, size: result.size });
      } else {
        fetchLiveBuild();
      }
      toast.success('Widget deployed to production!', {
        description: `Size: ${result.size || 'unknown'} — hard-refresh host apps to pick it up`,
      });
    } catch (err) {
      toast.error('Failed to deploy widget', {
        description: 'Check edge function logs for details',
      });
    } finally {
      setDeploying(false);
    }
  };

  const isStale = !!liveBuild && appCommit !== 'unknown' && liveBuild.commit !== appCommit;

  const status = !liveBuild
    ? { label: 'Never deployed', dot: 'bg-muted-foreground', text: 'text-muted-foreground' }
    : isStale
      ? { label: 'Changes not deployed', dot: 'bg-destructive', text: 'text-destructive' }
      : { label: 'Live bundle up to date', dot: 'bg-emerald-500', text: 'text-muted-foreground' };

  const shortCommit = (c?: string) => (c && c !== 'unknown' ? c.slice(0, 7) : '—');

  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              <h3 className="text-sm font-semibold tracking-tight">Production deployment</h3>
              <span className={`text-xs ${status.text}`}>· {status.label}</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              Settings save instantly. Widget <span className="font-medium text-foreground">code</span>{' '}
              changes only reach host sites after you publish the bundle.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchLiveBuild}
              title="Refresh status"
              className="text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleDeploy} disabled={deploying} className="gap-2">
              {deploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying…
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Deploy to production
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y border-t bg-muted/30 text-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-3 space-y-0.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Published</p>
            <p className="font-medium">
              {liveBuild ? new Date(liveBuild.publishedAt).toLocaleString() : 'Not published yet'}
            </p>
          </div>
          <div className="px-5 py-3 space-y-0.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live bundle</p>
            <p className="font-medium font-mono">
              {shortCommit(liveBuild?.commit)}
              {liveBuild?.size ? (
                <span className="font-sans text-muted-foreground">
                  {' '}
                  · {(liveBuild.size / 1024).toFixed(1)} KB
                </span>
              ) : null}
            </p>
          </div>
          <div className="px-5 py-3 space-y-0.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This app build</p>
            <p className="font-medium font-mono">{shortCommit(appCommit)}</p>
          </div>
        </div>

        {lastDeploy && (
          <p className="border-t px-5 py-2 text-xs text-muted-foreground">
            Last deploy from this browser: {lastDeploy.at}
            {lastDeploy.size ? ` · ${(lastDeploy.size / 1024).toFixed(1)} KB` : ''}
          </p>
        )}

        {variant === 'full' && (
          <div className="rounded-lg border bg-background/60 p-4 text-sm space-y-2">
            <p className="font-medium">What happens when you deploy</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>
                The bundled widget script is uploaded to the public <code>widget</code> storage
                bucket, overwriting <code>widget.js</code>.
              </li>
              <li>
                Host sites pick up the new file on their next load — the CDN caches it for up to ~1
                hour, so hard-refresh (or add <code>?v=</code> cache-buster) to verify immediately.
              </li>
              <li>
                No change is needed in the host app: config, locales and identity are read at
                runtime.
              </li>
            </ol>
            <p className="font-medium pt-2">Verify after deploying</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Open DevTools on the host site and check <code>window.NoddiWidget</code> exposes the
                expected methods (e.g. <code>identify</code>, <code>clearIdentity</code>).
              </li>
              <li>Open the contact form while logged in — name and email should be prefilled.</li>
              <li>
                Fetch <code>{WIDGET_SCRIPT_URL}</code> directly to confirm the served file contains
                your change.
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

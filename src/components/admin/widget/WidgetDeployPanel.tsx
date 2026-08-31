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

  return (
    <Card className="border-primary/40 bg-primary/5 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-primary/15 p-2 text-primary shrink-0">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">Deploy widget to production</p>
                {liveBuild ? (
                  isStale ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Out of date
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Up to date
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">Never deployed</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Settings save instantly, but widget <span className="font-medium">code</span> changes
                only reach host sites after you deploy the bundle.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={fetchLiveBuild} title="Refresh status">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleDeploy} disabled={deploying} size="lg" className="gap-2">
              {deploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Deploy to Production
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-background/60 p-3 text-xs space-y-1">
          <p className="font-medium text-sm">Currently published bundle</p>
          {liveBuild ? (
            <>
              <p className="text-muted-foreground">
                Published: {new Date(liveBuild.publishedAt).toLocaleString()}{' '}
                <span className="opacity-70">({liveBuild.publishedAt})</span>
              </p>
              <p className="text-muted-foreground">
                Commit: <code>{liveBuild.commit}</code>
                {liveBuild.size ? ` — ${(liveBuild.size / 1024).toFixed(1)} KB` : ''}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              No build manifest found yet — deploy once to stamp the bundle.
            </p>
          )}
          <p className="text-muted-foreground">
            This app build: <code>{appCommit}</code>
          </p>
          {lastDeploy && (
            <p className="text-muted-foreground">
              Last deploy from this browser: {lastDeploy.at}
              {lastDeploy.size ? ` — ${(lastDeploy.size / 1024).toFixed(1)} KB` : ''}
            </p>
          )}
        </div>

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

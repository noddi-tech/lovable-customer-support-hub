import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Rocket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WidgetEmbedCodeProps {
  widgetKey: string;
}

export const WidgetEmbedCode: React.FC<WidgetEmbedCodeProps> = ({ widgetKey }) => {
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Use the production Supabase URL
  const supabaseUrl = 'https://qgfaycwsangsqzpveoup.supabase.co';
  
  // Widget hosted on Supabase Storage
  const widgetScriptUrl = `${supabaseUrl}/storage/v1/object/public/widget/widget.js`;
  
  // Fixed embed code pattern that correctly queues to NoddiWidget.q
  const embedCode = `<!-- Noddi Contact Widget -->
<script>
  window.NoddiWidget = window.NoddiWidget || { q: [] };
  window.noddi = function() { window.NoddiWidget.q.push(arguments); };
  noddi('init', {
    widgetKey: '${widgetKey}',
    apiUrl: '${supabaseUrl}/functions/v1'
  });
</script>
<script src="${widgetScriptUrl}" async></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success('Embed code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/deploy-widget?action=deploy`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Deploy failed');
      }
      
      const result = await response.json();
      toast.success('Widget deployed to production!', {
        description: `Size: ${result.size || 'unknown'}`,
      });
    } catch (err) {
      toast.error('Failed to deploy widget', {
        description: 'Check edge function logs for details',
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Deploy Widget
          </CardTitle>
          <CardDescription>
            Push the latest widget bundle to production
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDeploy}
            disabled={deploying}
            className="gap-2"
          >
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation</CardTitle>
          <CardDescription>
            Add this code snippet just before the closing &lt;/body&gt; tag on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono max-w-full whitespace-pre-wrap break-all overflow-x-auto">
              <code>{embedCode}</code>
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widget Key</CardTitle>
          <CardDescription>
            Your unique widget identifier
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <code className="flex-1 bg-muted rounded-lg px-4 py-2 text-sm font-mono truncate min-w-0">
              {widgetKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(widgetKey);
                toast.success('Widget key copied');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testing</CardTitle>
          <CardDescription>
            Test the widget configuration endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              window.open(
                `${supabaseUrl}/functions/v1/widget-config?key=${widgetKey}`,
                '_blank'
              );
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Test Widget Config API
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">📋 Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Click "Deploy to Production" above to push the widget</p>
          <p>2. Copy the embed code</p>
          <p>3. Paste it into your website's HTML, just before &lt;/body&gt;</p>
          <p>4. The widget will appear in the corner of your page</p>
        </CardContent>
      </Card>
    </div>
  );
};
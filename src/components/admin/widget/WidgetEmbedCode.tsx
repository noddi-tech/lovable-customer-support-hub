import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Rocket, Loader2, ChevronDown, BookOpen, Code } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WidgetEmbedCodeProps {
  widgetKey: string;
}

export const WidgetEmbedCode: React.FC<WidgetEmbedCodeProps> = ({ widgetKey }) => {
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [apiRefOpen, setApiRefOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  // Use the production Supabase URL
  const supabaseUrl = 'https://qgfaycwsangsqzpveoup.supabase.co';

  const customButtonExample = `// Hide default button, use your own trigger
noddi('init', {
  widgetKey: '${widgetKey}',
  apiUrl: '${supabaseUrl}/functions/v1',
  showButton: false
});

// Open widget from your custom button
document.querySelector('#my-help-btn').addEventListener('click', () => {
  noddi('open');
});`;

  const positionExample = `noddi('init', {
  widgetKey: '${widgetKey}',
  apiUrl: '${supabaseUrl}/functions/v1',
  position: 'bottom-left'
});`;

  const handleCopyExample = async (code: string, name: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedExample(name);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedExample(null), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };
  
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

      {/* API Reference */}
      <Collapsible open={apiRefOpen} onOpenChange={setApiRefOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <CardTitle className="text-base">API Reference</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${apiRefOpen ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription>
                Configuration options and programmatic commands
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Configuration Options */}
              <div>
                <h4 className="font-medium mb-3">Configuration Options</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Option</th>
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="text-left p-2 font-medium">Default</th>
                        <th className="text-left p-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">widgetKey</td>
                        <td className="p-2 text-muted-foreground">string</td>
                        <td className="p-2 text-muted-foreground">required</td>
                        <td className="p-2">Your unique widget identifier</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">apiUrl</td>
                        <td className="p-2 text-muted-foreground">string</td>
                        <td className="p-2 text-muted-foreground">auto</td>
                        <td className="p-2">API endpoint (auto-configured)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">showButton</td>
                        <td className="p-2 text-muted-foreground">boolean</td>
                        <td className="p-2 font-mono text-xs">true</td>
                        <td className="p-2">Set to <code className="bg-muted px-1 rounded">false</code> to hide the floating button</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">position</td>
                        <td className="p-2 text-muted-foreground">string</td>
                        <td className="p-2 font-mono text-xs">'bottom-right'</td>
                        <td className="p-2"><code className="bg-muted px-1 rounded">'bottom-right'</code> or <code className="bg-muted px-1 rounded">'bottom-left'</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Programmatic Commands */}
              <div>
                <h4 className="font-medium mb-3">Programmatic Commands</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Command</th>
                        <th className="text-left p-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">noddi('open')</td>
                        <td className="p-2">Open the widget panel</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">noddi('close')</td>
                        <td className="p-2">Close the widget panel</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 font-mono text-xs">noddi('toggle')</td>
                        <td className="p-2">Toggle the widget open/closed</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Code Examples */}
      <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <CardTitle className="text-base">Code Examples</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${examplesOpen ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription>
                Ready-to-use code snippets for common integrations
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Custom Button Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Custom Button Integration</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => handleCopyExample(customButtonExample, 'custom')}
                  >
                    {copiedExample === 'custom' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  <code>{customButtonExample}</code>
                </pre>
              </div>

              {/* Position Override Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Position Override</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => handleCopyExample(positionExample, 'position')}
                  >
                    {copiedExample === 'position' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  <code>{positionExample}</code>
                </pre>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
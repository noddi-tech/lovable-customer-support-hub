import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WidgetEmbedCodeProps {
  widgetKey: string;
}

export const WidgetEmbedCode: React.FC<WidgetEmbedCodeProps> = ({ widgetKey }) => {
  const [copied, setCopied] = useState(false);

  // Get the base URL for the widget script
  const baseUrl = window.location.origin;
  
  // For production, you'd use your CDN URL
  const widgetScriptUrl = `${baseUrl}/widget.js`;
  
  // Edge function URL for widget config
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  
  const embedCode = `<!-- Noddi Contact Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['NoddiWidget']=o;
    w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','noddi','${widgetScriptUrl}'));
  
  noddi('init', {
    widgetKey: '${widgetKey}',
    apiUrl: '${supabaseUrl}/functions/v1'
  });
</script>`;

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation</CardTitle>
          <CardDescription>
            Add this code snippet just before the closing &lt;/body&gt; tag on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto font-mono">
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
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted rounded-lg px-4 py-2 text-sm font-mono">
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
          <p>1. Copy the embed code above</p>
          <p>2. Paste it into your website's HTML, just before &lt;/body&gt;</p>
          <p>3. The widget will appear in the corner of your page</p>
          <p>4. Messages will arrive in your inbox</p>
        </CardContent>
      </Card>
    </div>
  );
};

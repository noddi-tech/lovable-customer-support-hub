import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Activity, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookStatus {
  success: boolean;
  message: string;
  hostname?: string;
  currentUrl?: string;
  newUrl?: string;
  previousUrl?: string;
  status?: string;
  error?: string;
  details?: any;
}

interface DiagnosticInfo {
  status: string;
  timestamp: string;
  requestId: string;
  environment: {
    hasInboundToken: boolean;
    hasSendGridApiKey: boolean;
    hasSupabaseUrl: boolean;
    hasServiceKey: boolean;
  };
  expectedWebhookUrl: string;
  instructions: string;
}

export const SendgridWebhookFixer: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    setDiagnosticError(null);
    
    try {
      const response = await fetch('https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sendgrid-inbound', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDiagnostics(data);
    } catch (error: any) {
      setDiagnosticError(error.message || 'Failed to fetch diagnostics');
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fixWebhook = async () => {
    setIsFixing(true);
    setStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('fix-sendgrid-webhook', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setStatus(data);
      
      if (data.success) {
        toast({
          title: "Webhook Fixed",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Fix Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to fix webhook';
      setStatus({
        success: false,
        error: errorMsg,
        message: errorMsg
      });
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          SendGrid Inbound Webhook Diagnostics
        </CardTitle>
        <CardDescription>
          Debug and fix SendGrid inbound email webhook configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Diagnostic Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Edge Function Status</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDiagnostics}
              disabled={isLoadingDiagnostics}
            >
              {isLoadingDiagnostics ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {diagnosticError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error fetching diagnostics:</strong> {diagnosticError}
              </AlertDescription>
            </Alert>
          )}

          {diagnostics && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={diagnostics.status === 'alive' ? 'default' : 'destructive'}>
                  {diagnostics.status === 'alive' ? '✓ Online' : '✗ Offline'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Last checked: {new Date(diagnostics.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {diagnostics.environment.hasInboundToken ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span>SENDGRID_INBOUND_TOKEN</span>
                </div>
                <div className="flex items-center gap-2">
                  {diagnostics.environment.hasSendGridApiKey ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span>SENDGRID_API_KEY</span>
                </div>
                <div className="flex items-center gap-2">
                  {diagnostics.environment.hasSupabaseUrl ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span>SUPABASE_URL</span>
                </div>
                <div className="flex items-center gap-2">
                  {diagnostics.environment.hasServiceKey ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span>SUPABASE_SERVICE_ROLE_KEY</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Expected Webhook URL:</p>
                <code className="text-xs break-all block bg-background p-2 rounded border">
                  {diagnostics.expectedWebhookUrl}?token=YOUR_TOKEN
                </code>
              </div>
            </div>
          )}

          {diagnostics && !diagnostics.environment?.hasInboundToken && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing SENDGRID_INBOUND_TOKEN!</strong> The edge function cannot authenticate incoming webhooks.
                <a 
                  href="https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline mt-1"
                >
                  Add secret in Supabase <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <hr className="my-4" />

        {/* Fix Webhook Section */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Fix Webhook:</strong> If emails aren't being received, the SendGrid webhook URL may be misconfigured.
            This tool will update the SendGrid Inbound Parse settings with the correct URL and token.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={fixWebhook} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing Webhook...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Fix SendGrid Webhook Configuration
            </>
          )}
        </Button>

        {status && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status.success ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <Badge variant={status.success ? "default" : "destructive"}>
                {status.success ? "Success" : "Failed"}
              </Badge>
            </div>

            <Alert variant={status.success ? "default" : "destructive"}>
              <AlertDescription>
                <strong>Result:</strong> {status.message}
                
                {status.hostname && (
                  <div className="mt-2">
                    <strong>Hostname:</strong> {status.hostname}
                  </div>
                )}
                
                {status.previousUrl && status.newUrl && (
                  <div className="mt-2 space-y-1">
                    <div><strong>Previous URL:</strong></div>
                    <code className="text-xs break-all block bg-muted p-2 rounded">
                      {status.previousUrl}
                    </code>
                    <div><strong>New URL:</strong></div>
                    <code className="text-xs break-all block bg-muted p-2 rounded">
                      {status.newUrl}
                    </code>
                  </div>
                )}

                {status.currentUrl && status.status === 'no_change_needed' && (
                  <div className="mt-2">
                    <div><strong>Current URL:</strong></div>
                    <code className="text-xs break-all block bg-muted p-2 rounded">
                      {status.currentUrl}
                    </code>
                  </div>
                )}

                {status.error && (
                  <div className="mt-2">
                    <strong>Error Details:</strong> {status.error}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {status.details && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(status.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Checks current SendGrid webhook configuration</li>
            <li>Updates the webhook URL with the correct authentication token</li>
            <li>Updates the database with the matching token</li>
            <li>Ensures emails to hei@noddi.no work in real-time</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
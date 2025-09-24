import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
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

export const SendgridWebhookFixer: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const { toast } = useToast();

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
          <AlertTriangle className="h-5 w-5 text-warning" />
          SendGrid Webhook Fixer
        </CardTitle>
        <CardDescription>
          Fix authentication issues with hei@noddi.no email webhook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Issue:</strong> Emails to hei@noddi.no are failing with 401 Unauthorized. 
            This tool will update the SendGrid webhook URL with the correct authentication token.
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
              Fix SendGrid Webhook
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
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const WebhookTester: React.FC = () => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testWebhook = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Create a sample Aircall webhook payload
      const testPayload = {
        event: 'call.created',
        timestamp: new Date().toISOString(),
        data: {
          id: 'test-call-' + Date.now(),
          status: 'ringing',
          direction: 'inbound',
          from: { phone_number: '+1234567890' },
          to: { phone_number: '+0987654321' },
          started_at: new Date().toISOString(),
          raw_digits: '+1234567890'
        }
      };

      console.log('Testing webhook with payload:', testPayload);

      // Test direct webhook call
      const webhookUrl = 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/call-events-webhook/aircall';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.text();
      console.log('Webhook response:', result);

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Webhook test successful! Response: ${result}`
        });
      } else {
        setTestResult({
          success: false,
          message: `Webhook failed with status ${response.status}: ${result}`
        });
      }

    } catch (error) {
      console.error('Webhook test error:', error);
      setTestResult({
        success: false,
        message: `Error testing webhook: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Webhook Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Test if the webhook endpoint is reachable and working
          </p>
          <Button 
            onClick={testWebhook} 
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Testing...' : 'Test Webhook'}
          </Button>
        </div>

        {testResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.success ? 'Test Successful' : 'Test Failed'}
              </p>
              <p className={`text-xs ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message}
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Aircall Configuration</h4>
          <div className="space-y-2 text-xs">
            <div>
              <strong>Webhook URL:</strong>
              <code className="block bg-muted p-1 rounded mt-1 text-xs break-all">
                https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/call-events-webhook/aircall
              </code>
            </div>
            <div>
              <strong>Required Events:</strong> call.created, call.answered, call.hungup, call.missed
            </div>
            <div>
              <strong>Method:</strong> POST
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Send, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  payload: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
    headers?: string;
    envelope?: string;
  };
  expectSuccess: boolean;
}

export const SendGridWebhookTester: React.FC = () => {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('basic');

  const testScenarios: TestScenario[] = [
    {
      id: 'basic',
      name: 'Basic Email Test',
      description: 'Test basic email reception to hei@inbound.noddi.no',
      payload: {
        to: 'Hei <hei@inbound.noddi.no>',
        from: 'Test User <test@example.com>',
        subject: 'Test Email from SendGrid Webhook Tester',
        text: 'This is a test email to verify the SendGrid webhook is working correctly.',
        html: '<p>This is a <strong>test email</strong> to verify the SendGrid webhook is working correctly.</p>',
        headers: `Message-ID: <test-${Date.now()}@example.com>
Date: ${new Date().toUTCString()}
From: Test User <test@example.com>
To: Hei <hei@inbound.noddi.no>
Subject: Test Email from SendGrid Webhook Tester
Content-Type: multipart/alternative`,
        envelope: JSON.stringify({
          to: ['hei@inbound.noddi.no'],
          from: 'test@example.com'
        })
      },
      expectSuccess: true
    },
    {
      id: 'google-group',
      name: 'Google Group Forwarding',
      description: 'Simulate Google Group forwarding with "via" rewriting',
      payload: {
        to: 'Hei <hei@inbound.noddi.no>',
        from: 'test@example.com via Hei <hei@inbound.noddi.no>',
        subject: 'Test via Google Groups',
        text: 'This simulates a Google Group forwarded email.',
        headers: `Message-ID: <group-test-${Date.now()}@example.com>
Date: ${new Date().toUTCString()}
From: test@example.com via Hei <hei@inbound.noddi.no>
Reply-To: test@example.com
To: Hei <hei@inbound.noddi.no>
Subject: Test via Google Groups
Sender: hei@inbound.noddi.no`,
        envelope: JSON.stringify({
          to: ['hei@inbound.noddi.no'],
          from: 'hei@inbound.noddi.no'
        })
      },
      expectSuccess: true
    },
    {
      id: 'threaded',
      name: 'Threaded Conversation',
      description: 'Test email threading with In-Reply-To header',
      payload: {
        to: 'Hei <hei@inbound.noddi.no>',
        from: 'Customer <customer@example.com>',
        subject: 'Re: Previous conversation',
        text: 'This is a follow-up to our previous conversation.',
        headers: `Message-ID: <reply-test-${Date.now()}@example.com>
Date: ${new Date().toUTCString()}
From: Customer <customer@example.com>
To: Hei <hei@inbound.noddi.no>
Subject: Re: Previous conversation
In-Reply-To: <original-message-id@example.com>
References: <original-message-id@example.com>`,
        envelope: JSON.stringify({
          to: ['hei@inbound.noddi.no'],
          from: 'customer@example.com'
        })
      },
      expectSuccess: true
    },
    {
      id: 'invalid-auth',
      name: 'Invalid Authentication',
      description: 'Test with invalid authentication token',
      payload: {
        to: 'hei@inbound.noddi.no',
        from: 'test@example.com',
        subject: 'Should fail auth',
        text: 'This should fail due to invalid token.'
      },
      expectSuccess: false
    }
  ];

  const webhookUrl = 'https://qgfaycwsangsqzpveoup.functions.supabase.co/sendgrid-inbound';
  const authToken = 'asdaasdpjojasodjojeasd912812974'; // From SENDGRID_INBOUND_TOKEN

  const testWebhook = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const scenario = testScenarios.find(s => s.id === selectedScenario);
      if (!scenario) {
        throw new Error('Invalid test scenario selected');
      }

      console.log('Testing SendGrid webhook with scenario:', scenario.name);

      // Create FormData payload (SendGrid sends multipart/form-data)
      const formData = new FormData();
      Object.entries(scenario.payload).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });

      // Use invalid token for auth test scenario
      const token = scenario.id === 'invalid-auth' ? 'invalid-token' : authToken;
      const testUrl = `${webhookUrl}?token=${token}`;

      console.log('Sending to URL:', testUrl);
      console.log('FormData entries:', Object.fromEntries(formData.entries()));

      const response = await fetch(testUrl, {
        method: 'POST',
        body: formData
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }

      console.log('Webhook response:', { status: response.status, data: responseData });

      const success = response.ok === scenario.expectSuccess;
      
      setTestResult({
        success,
        message: success 
          ? `${scenario.name} completed as expected! Status: ${response.status}`
          : `${scenario.name} failed. Expected ${scenario.expectSuccess ? 'success' : 'failure'} but got ${response.ok ? 'success' : 'failure'}. Status: ${response.status}`,
        details: {
          status: response.status,
          response: responseData,
          expectedSuccess: scenario.expectSuccess,
          actualSuccess: response.ok
        }
      });

    } catch (error) {
      console.error('SendGrid webhook test error:', error);
      setTestResult({
        success: false,
        message: `Error testing webhook: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${webhookUrl}?token=${authToken}`);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Send className="w-4 h-4" />
          SendGrid Webhook Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="scenario-select" className="text-sm font-medium">
            Test Scenario
          </Label>
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose test scenario" />
            </SelectTrigger>
            <SelectContent>
              {testScenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  <div>
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-xs text-muted-foreground">{scenario.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={testWebhook} 
            disabled={isLoading}
            size="sm"
            className="flex-1"
          >
            {isLoading ? 'Testing...' : 'Run Test'}
          </Button>
          <Button 
            onClick={copyWebhookUrl}
            variant="outline"
            size="sm"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy URL
          </Button>
        </div>

        {testResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg border ${
            testResult.success 
              ? 'bg-success/10 border-success/20 text-success' 
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {testResult.success ? 'Test Successful' : 'Test Failed'}
              </p>
              <p className="text-xs mt-1 opacity-90">
                {testResult.message}
              </p>
              {testResult.details && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
                    View Details
                  </summary>
                  <pre className="text-xs mt-1 p-2 bg-background/50 rounded border overflow-auto max-h-32">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium">SendGrid Configuration</h4>
          <div className="space-y-2 text-xs">
            <div>
              <strong>Webhook URL:</strong>
              <code className="block bg-muted p-2 rounded mt-1 text-xs break-all">
                {webhookUrl}?token={authToken}
              </code>
            </div>
            <div>
              <strong>Method:</strong> POST (multipart/form-data)
            </div>
            <div>
              <strong>Authentication:</strong> URL parameter token
            </div>
            <div>
              <strong>Test Route:</strong> hei@inbound.noddi.no → Noddi inbox
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
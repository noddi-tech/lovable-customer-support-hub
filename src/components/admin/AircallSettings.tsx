import React, { useState, useEffect } from 'react';
import { Phone, Plus, X, Shield, Settings, CheckCircle, AlertCircle, TestTube, PhoneCall, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { formatRelativeTime } from '@/utils/dateFormatting';

interface CallEventConfig {
  eventType: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface PhoneNumber {
  id: string;
  number: string;
  label: string;
}

export const AircallSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { 
    getIntegrationByProvider, 
    saveIntegration, 
    isSaving, 
    isLoading: isLoadingIntegrations,
    lastEventTimestamp
  } = useVoiceIntegrations();
  
  // Get existing Aircall configuration
  const existingConfig = getIntegrationByProvider('aircall');
  
  const [webhookToken, setWebhookToken] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState('');
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  
  // Aircall Everywhere settings
  const [everywhereEnabled, setEverywhereEnabled] = useState(false);
  const [everywhereApiId, setEverywhereApiId] = useState('');
  const [everywhereApiToken, setEverywhereApiToken] = useState('');
  const [everywhereDomain, setEverywhereDomain] = useState('');
  
  // Credential testing
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [credentialTestResult, setCredentialTestResult] = useState<{
    valid: boolean;
    companyName?: string;
    error?: string;
    timestamp?: Date;
  } | null>(null);

  // Load existing configuration when it changes
  useEffect(() => {
    if (existingConfig) {
      setWebhookToken(existingConfig.webhook_token || '');
      setPhoneNumbers(existingConfig.configuration.phoneNumbers || []);
      
      // Update call events with saved configuration
      const savedEvents = existingConfig.configuration.callEvents;
      if (savedEvents) {
        setCallEvents(savedEvents);
      }
      
      // Load Aircall Everywhere settings
      const everywhereConfig = existingConfig.configuration.aircallEverywhere;
      if (everywhereConfig) {
        setEverywhereEnabled(everywhereConfig.enabled || false);
        setEverywhereApiId(everywhereConfig.apiId || '');
        setEverywhereApiToken(everywhereConfig.apiToken || '');
        setEverywhereDomain(everywhereConfig.domainName || '');
      }
    } else {
      // Set default phone number if no config exists
      setPhoneNumbers([{ id: '1', number: '+1234567890', label: 'Main Line' }]);
    }
  }, [existingConfig]);
  
  const [callEvents, setCallEvents] = useState<CallEventConfig[]>([
    {
      eventType: 'call_started',
      label: 'Call Started',
      description: 'When a new call is initiated',
      enabled: true
    },
    {
      eventType: 'call_answered',
      label: 'Call Answered',
      description: 'When a call is answered by an agent',
      enabled: true
    },
    {
      eventType: 'call_ended',
      label: 'Call Ended',
      description: 'When a call is terminated',
      enabled: true
    },
    {
      eventType: 'call_missed',
      label: 'Call Missed',
      description: 'When an incoming call is not answered',
      enabled: true
    },
    {
      eventType: 'voicemail_left',
      label: 'Voicemail Left',
      description: 'When a caller leaves a voicemail',
      enabled: true
    },
    {
      eventType: 'callback_requested',
      label: 'Callback Requested',
      description: 'When a caller requests a callback through IVR',
      enabled: true
    },
    {
      eventType: 'call_transferred',
      label: 'Call Transferred',
      description: 'When a call is transferred to another agent',
      enabled: false
    },
    {
      eventType: 'call_on_hold',
      label: 'Call On Hold',
      description: 'When a call is put on hold',
      enabled: false
    }
  ]);

  const handleEventToggle = (eventType: string) => {
    setCallEvents(prev => 
      prev.map(event => 
        event.eventType === eventType 
          ? { ...event, enabled: !event.enabled }
          : event
      )
    );
  };

  const handleAddPhoneNumber = () => {
    if (newPhoneNumber && newPhoneLabel) {
      const newPhone: PhoneNumber = {
        id: Date.now().toString(),
        number: newPhoneNumber,
        label: newPhoneLabel
      };
      setPhoneNumbers(prev => [...prev, newPhone]);
      setNewPhoneNumber('');
      setNewPhoneLabel('');
      setIsAddingPhone(false);
      toast({
        title: "Phone number added",
        description: `${newPhoneLabel} (${newPhoneNumber}) has been added to monitoring`,
      });
    }
  };

  const handleRemovePhoneNumber = (id: string) => {
    setPhoneNumbers(prev => prev.filter(phone => phone.id !== id));
    toast({
      title: "Phone number removed",
      description: "Phone number has been removed from monitoring",
    });
  };

  const handleSaveSettings = () => {
    const configuration = {
      phoneNumbers,
      callEvents,
      enabledEvents: callEvents.filter(event => event.enabled).map(event => event.eventType),
      aircallEverywhere: {
        enabled: everywhereEnabled,
        apiId: everywhereApiId,
        apiToken: everywhereApiToken,
        domainName: everywhereDomain || window.location.hostname
      }
    };

    saveIntegration({
      provider: 'aircall',
      is_active: true,
      webhook_token: webhookToken,
      configuration
    });
  };

  const testCredentials = async () => {
    if (!everywhereApiId || !everywhereApiToken) {
      toast({
        title: "Missing credentials",
        description: "Please enter both API ID and API Token",
        variant: "destructive"
      });
      return;
    }

    setIsTestingCredentials(true);
    setCredentialTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-aircall-credentials', {
        body: {
          apiId: everywhereApiId,
          apiToken: everywhereApiToken
        }
      });

      if (error) {
        throw error;
      }

      setCredentialTestResult({
        valid: data.valid,
        companyName: data.company?.name,
        error: data.error,
        timestamp: new Date()
      });

      if (data.valid) {
        toast({
          title: "Credentials valid",
          description: `Successfully connected to ${data.company.name}`,
        });
      } else {
        toast({
          title: "Credentials invalid",
          description: data.error || "Unable to authenticate with Aircall",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Credential test error:', error);
      setCredentialTestResult({
        valid: false,
        error: error.message,
        timestamp: new Date()
      });
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingCredentials(false);
    }
  };

  const testWebhook = async () => {
    setIsTestingWebhook(true);
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
      const webhookUrl = 'https://qgfaycwsangsqzpveoup.functions.supabase.co/call-events-webhook/aircall';
      
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
        toast({
          title: "Webhook test successful",
          description: "Your webhook endpoint is working correctly",
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
      setIsTestingWebhook(false);
    }
  };

  const enabledEventsCount = callEvents.filter(event => event.enabled).length;

  if (isLoadingIntegrations) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mx-auto mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Phone className="w-5 h-5" />
            Aircall Integration Status
          </CardTitle>
          <CardDescription>
            Monitor the connection status and configuration health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
            <span className="text-sm text-muted-foreground">
              {lastEventTimestamp 
                ? `Last event: ${formatRelativeTime(lastEventTimestamp)}`
                : 'No events received yet'
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Shield className="w-5 h-5" />
            Webhook Security
          </CardTitle>
          <CardDescription>
            Configure the webhook token for secure event verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-token">Webhook Verification Token</Label>
            <Input
              id="webhook-token"
              type="password"
              placeholder="Enter your Aircall webhook token"
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This token is provided by Aircall and used to verify incoming webhook events
            </p>
          </div>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Keep this token secure. It's used to verify that webhook calls are coming from Aircall.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Phone Numbers Configuration */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Phone className="w-5 h-5" />
            Monitored Phone Numbers
          </CardTitle>
          <CardDescription>
            Configure which Aircall phone numbers should trigger events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {phoneNumbers.map((phone) => (
              <div key={phone.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div>
                  <p className="font-medium">{phone.label}</p>
                  <p className="text-sm text-muted-foreground">{phone.number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePhoneNumber(phone.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {isAddingPhone ? (
            <div className="space-y-3 p-3 rounded-lg border bg-card/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-phone-label">Label</Label>
                  <Input
                    id="new-phone-label"
                    placeholder="e.g., Main Line"
                    value={newPhoneLabel}
                    onChange={(e) => setNewPhoneLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone-number">Phone Number</Label>
                  <Input
                    id="new-phone-number"
                    placeholder="e.g., +1234567890"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddPhoneNumber}>
                  Add Number
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsAddingPhone(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingPhone(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Phone Number
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Aircall Everywhere (Embedded Phone) Configuration */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <PhoneCall className="w-5 h-5" />
            Aircall Everywhere - Embedded Phone
          </CardTitle>
          <CardDescription>
            Enable embedded calling directly in the browser for agents. Requires Aircall Everywhere API credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="everywhere-enabled" className="text-sm font-medium">
                Enable Aircall Everywhere
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow agents to answer calls directly in the platform
              </p>
            </div>
            <Switch
              id="everywhere-enabled"
              checked={everywhereEnabled}
              onCheckedChange={setEverywhereEnabled}
            />
          </div>

          {everywhereEnabled && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="everywhere-api-id">API ID</Label>
                  <Input
                    id="everywhere-api-id"
                    type="text"
                    placeholder="Enter your Aircall Everywhere API ID"
                    value={everywhereApiId}
                    onChange={(e) => setEverywhereApiId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your Aircall Dashboard under Integrations → Aircall Everywhere
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="everywhere-api-token">API Token</Label>
                  <Input
                    id="everywhere-api-token"
                    type="password"
                    placeholder="Enter your Aircall Everywhere API Token"
                    value={everywhereApiToken}
                    onChange={(e) => setEverywhereApiToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Keep this token secure. It's used to authenticate agents with Aircall.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="everywhere-domain">Domain Name (Optional)</Label>
                  <Input
                    id="everywhere-domain"
                    type="text"
                    placeholder={window.location.hostname}
                    value={everywhereDomain}
                    onChange={(e) => setEverywhereDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use current domain: {window.location.hostname}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={testCredentials}
                    disabled={isTestingCredentials || !everywhereApiId || !everywhereApiToken}
                    variant="outline"
                    className="w-full"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {isTestingCredentials ? t('settings.aircall.testingCredentials') : t('settings.aircall.testCredentials')}
                  </Button>

                  {credentialTestResult && (
                    <Alert variant={credentialTestResult.valid ? "default" : "destructive"}>
                      {credentialTestResult.valid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {credentialTestResult.valid ? (
                          <>
                            {t('settings.aircall.credentialsValid')} <strong>{credentialTestResult.companyName}</strong>
                          </>
                        ) : (
                          <>
                            {t('settings.aircall.credentialsInvalid')}: {credentialTestResult.error}
                          </>
                        )}
                        {credentialTestResult.timestamp && (
                          <div className="text-xs mt-1 opacity-70">
                            {t('settings.aircall.lastTested')}: {credentialTestResult.timestamp.toLocaleTimeString()}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Aircall Everywhere enables in-app calling with full agent controls. 
                  Make sure your API credentials are configured correctly in Aircall Dashboard.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Call Events Configuration */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Settings className="w-5 h-5" />
            Call Event Types
          </CardTitle>
          <CardDescription>
            Choose which call events to receive and process ({enabledEventsCount} of {callEvents.length} enabled)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {callEvents.map((event, index) => (
              <div key={event.eventType}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={event.eventType}
                      checked={event.enabled}
                      onCheckedChange={() => handleEventToggle(event.eventType)}
                    />
                    <div>
                      <Label htmlFor={event.eventType} className="text-sm font-medium">
                        {event.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                  {event.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                {index < callEvents.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Disabling event types will prevent them from being processed, but they may still be received from Aircall.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Webhook Testing */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TestTube className="w-5 h-5" />
            Webhook Testing
          </CardTitle>
          <CardDescription>
            Test the webhook endpoint to ensure it's working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Test if the webhook endpoint is reachable and processing events correctly
            </p>
            <Button 
              onClick={testWebhook} 
              disabled={isTestingWebhook}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {isTestingWebhook ? 'Testing...' : 'Test Webhook'}
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-start gap-3 p-3 rounded-lg ${
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
            <h4 className="text-sm font-medium mb-3">Aircall Webhook Configuration</h4>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Webhook URL</Label>
                <code className="block bg-muted p-2 rounded mt-1 text-xs break-all">
                  https://qgfaycwsangsqzpveoup.functions.supabase.co/call-events-webhook/aircall
                </code>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Required Events</Label>
                <p className="text-xs">call.created, call.answered, call.hungup, call.missed, voicemail.left</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Method</Label>
                <p className="text-xs">POST</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Browser Requirements Alert */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          <strong>Browser Requirements:</strong> Aircall Everywhere requires Google Chrome or Edge. 
          Third-party cookies must be enabled. Safari and Firefox are not supported.
          Make sure to save your configuration and test credentials before enabling.
        </AlertDescription>
      </Alert>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};
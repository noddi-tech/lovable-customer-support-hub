import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSlackIntegration } from '@/hooks/useSlackIntegration';
import { useOrganizationStore } from '@/stores/organizationStore';
import { 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Slack
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SlackSetupWizardProps {
  onComplete?: () => void;
}

const STEPS = [
  { title: 'Introduction', description: 'What you\'ll need' },
  { title: 'Create Slack App', description: 'Step-by-step guide' },
  { title: 'Enter Credentials', description: 'Client ID & Secret' },
  { title: 'Connect Workspace', description: 'Authorize access' },
];

const REQUIRED_SCOPES = [
  'channels:read',
  'chat:write',
  'users:read',
  'groups:read',
];

export function SlackSetupWizard({ onComplete }: SlackSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [credentialsTested, setCredentialsTested] = useState(false);
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { currentOrganizationId } = useOrganizationStore();
  const { saveCredentials, testCredentials, getAuthorizationUrl } = useSlackIntegration();

  // Fetch organization name
  const { data: organization } = useQuery({
    queryKey: ['organization', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', currentOrganizationId)
        .single();
      return data;
    },
    enabled: !!currentOrganizationId,
  });

  const redirectUrl = `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/slack-oauth?action=callback`;

  const handleCopyRedirectUrl = () => {
    navigator.clipboard.writeText(redirectUrl);
    toast.success('Redirect URL copied to clipboard');
  };

  const handleCopyScopes = () => {
    navigator.clipboard.writeText(REQUIRED_SCOPES.join(', '));
    toast.success('Scopes copied to clipboard');
  };

  const handleTestCredentials = async () => {
    if (!clientId || !clientSecret) {
      toast.error('Please enter both Client ID and Client Secret');
      return;
    }

    setIsTestingCredentials(true);
    try {
      await testCredentials.mutateAsync({ client_id: clientId, client_secret: clientSecret });
      setCredentialsTested(true);
      toast.success('Credentials are valid!');
    } catch (error: any) {
      setCredentialsTested(false);
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setIsTestingCredentials(false);
    }
  };

  const handleSaveAndConnect = async () => {
    if (!credentialsTested) {
      toast.error('Please test your credentials first');
      return;
    }

    setIsSaving(true);
    try {
      await saveCredentials.mutateAsync({ client_id: clientId, client_secret: clientSecret });
      
      // Get authorization URL and redirect
      const result = await getAuthorizationUrl.mutateAsync();
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#4A154B] rounded-lg">
            <Slack className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle>Set Up Slack Integration</CardTitle>
            <CardDescription>
              Post notifications to your team's Slack workspace
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length} • {STEPS[currentStep].title}
            </span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Welcome to Slack Integration Setup</h3>
            <p className="text-muted-foreground">
              Connect your Slack workspace to receive real-time notifications about new conversations, 
              customer replies, and important events.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium">What you'll need:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Admin access to your Slack workspace
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  5-10 minutes to complete the setup
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Permission to create Slack apps
                </li>
              </ul>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
              <h4 className="font-medium text-primary mb-2">What you'll be able to do:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Get instant notifications in your chosen Slack channel</li>
                <li>• See who's assigned to new conversations</li>
                <li>• Preview customer messages directly in Slack</li>
                <li>• Customize which events trigger notifications</li>
              </ul>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Create Your Slack App</h3>
            <p className="text-muted-foreground">
              Follow these steps to create a Slack app for your workspace:
            </p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Go to Slack API and create a new app</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">
                      Open Slack API <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Click "Create New App" → "From scratch"
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Name your app and select workspace</p>
                  <p className="text-sm text-muted-foreground">
                    App Name: e.g., "{organization?.name || 'Company'} Notifications"<br />
                    Workspace: Select your Slack workspace
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Add Bot Token Scopes</p>
                  <p className="text-sm text-muted-foreground">
                    Go to "OAuth & Permissions" → "Scopes" → "Bot Token Scopes"
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                      {REQUIRED_SCOPES.join(', ')}
                    </code>
                    <Button variant="ghost" size="icon" onClick={handleCopyScopes}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  4
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Add Redirect URL</p>
                  <p className="text-sm text-muted-foreground">
                    In "OAuth & Permissions" → "Redirect URLs", add:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">
                      {redirectUrl}
                    </code>
                    <Button variant="ghost" size="icon" onClick={handleCopyRedirectUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  5
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Copy your credentials</p>
                  <p className="text-sm text-muted-foreground">
                    Go to "Basic Information" → "App Credentials"<br />
                    Copy your <strong>Client ID</strong> and <strong>Client Secret</strong> for the next step
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Enter Your Credentials</h3>
            <p className="text-muted-foreground">
              Enter the Client ID and Client Secret from your Slack App's "Basic Information" page.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input
                  id="client-id"
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setCredentialsTested(false);
                  }}
                  placeholder="e.g., 1234567890.1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="client-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => {
                      setClientSecret(e.target.value);
                      setCredentialsTested(false);
                    }}
                    placeholder="Enter your Client Secret"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleTestCredentials}
                disabled={!clientId || !clientSecret || isTestingCredentials}
                className="w-full"
              >
                {isTestingCredentials ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : credentialsTested ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Credentials Valid
                  </>
                ) : (
                  '🧪 Test Credentials'
                )}
              </Button>

              {credentialsTested && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  Your credentials are valid! Click "Next" to connect your workspace.
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Connect Your Workspace</h3>
            <p className="text-muted-foreground">
              Click the button below to authorize the app and connect your Slack workspace.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    What happens next:
                  </p>
                  <ul className="mt-1 text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• You'll be redirected to Slack</li>
                    <li>• Review and approve the requested permissions</li>
                    <li>• You'll be redirected back here automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveAndConnect}
              disabled={!credentialsTested || isSaving}
              className="w-full"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Slack className="h-4 w-4 mr-2" />
                  Connect to Slack
                </>
              )}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={currentStep === 2 && !credentialsTested}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

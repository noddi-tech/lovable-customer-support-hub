import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSlackIntegration } from '@/hooks/useSlackIntegration';
import { 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft,
  ArrowRight,
  Slack,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

interface SlackSetupWizardProps {
  onComplete?: () => void;
}

const STEPS = [
  { title: 'Introduction', description: 'What you\'ll need' },
  { title: 'Create Slack App', description: 'Quick setup guide' },
  { title: 'Get Bot Token', description: 'Install & copy token' },
  { title: 'Connect', description: 'Paste token to connect' },
];

const REQUIRED_SCOPES = [
  'channels:read',
  'chat:write',
  'users:read',
  'groups:read',
];

export function SlackSetupWizard({ onComplete }: SlackSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { currentOrganizationId } = useOrganizationStore();
  const { saveDirectToken } = useSlackIntegration();

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

  const handleCopyScopes = () => {
    navigator.clipboard.writeText(REQUIRED_SCOPES.join(', '));
    toast.success('Scopes copied to clipboard');
  };

  const handleConnect = async () => {
    if (!botToken) {
      toast.error('Please enter your Bot Token');
      return;
    }

    if (!botToken.startsWith('xoxb-')) {
      toast.error('Bot tokens should start with xoxb-');
      return;
    }

    setIsConnecting(true);
    try {
      await saveDirectToken.mutateAsync({ bot_token: botToken });
      onComplete?.();
    } catch (error: any) {
      // Error is already handled by the mutation
    } finally {
      setIsConnecting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isTokenValid = botToken.startsWith('xoxb-') && botToken.length > 20;

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

        {/* Step 1: Introduction */}
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
                  5 minutes to complete the setup
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

        {/* Step 2: Create Slack App */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Create Your Slack App</h3>
            <p className="text-muted-foreground">
              Follow these simple steps to create a Slack app:
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
                    Go to "OAuth & Permissions" → Scroll to "Scopes" → "Bot Token Scopes" → Click "Add an OAuth Scope"
                  </p>
                  <p className="text-sm text-muted-foreground">Add these scopes:</p>
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
            </div>
          </div>
        )}

        {/* Step 3: Get Bot Token */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Install App & Get Bot Token</h3>
            <p className="text-muted-foreground">
              Now install the app to your workspace and copy the Bot Token:
            </p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Install App to Workspace</p>
                  <p className="text-sm text-muted-foreground">
                    In your Slack app settings, go to "Install App" in the left sidebar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click "Install to Workspace" and authorize the app
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Copy Bot User OAuth Token</p>
                  <p className="text-sm text-muted-foreground">
                    After installation, you'll see "Bot User OAuth Token" on the same page
                  </p>
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 rounded">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                      Copy the token that starts with <code className="bg-green-100 dark:bg-green-900 px-1 rounded">xoxb-</code>
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      This is the only token you need - no redirect URLs or OAuth flow required!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Connect */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Connect to Slack</h3>
            <p className="text-muted-foreground">
              Paste your Bot User OAuth Token below to complete the connection:
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-token">Bot User OAuth Token</Label>
                <div className="relative">
                  <Input
                    id="bot-token"
                    type={showToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="xoxb-your-token-here"
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {botToken && !botToken.startsWith('xoxb-') && (
                  <p className="text-sm text-destructive">Token should start with xoxb-</p>
                )}
                {isTokenValid && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Token format looks valid
                  </p>
                )}
              </div>

              <Button
                onClick={handleConnect}
                disabled={!isTokenValid || isConnecting}
                className="w-full"
                size="lg"
              >
                {isConnecting ? (
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

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Your token is securely stored and only used to send notifications to your Slack workspace.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 && (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

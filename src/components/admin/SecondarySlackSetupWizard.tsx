import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  BarChart3,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

interface SecondarySlackSetupWizardProps {
  onConnect: (token: string) => Promise<void>;
  isConnecting: boolean;
}

const STEPS = [
  { title: 'Introduction', description: 'Why connect a second workspace' },
  { title: 'Create Slack App', description: 'Set up in your product workspace' },
  { title: 'Add Scopes & Install', description: 'Permissions & installation' },
  { title: 'Connect', description: 'Paste token to finish' },
];

const REQUIRED_SCOPES = ['channels:read', 'groups:read', 'chat:write'];

export function SecondarySlackSetupWizard({ onConnect, isConnecting }: SecondarySlackSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleCopyScopes = () => {
    navigator.clipboard.writeText(REQUIRED_SCOPES.join(', '));
    toast.success('Scopes copied to clipboard');
  };

  const handleConnect = async () => {
    if (!botToken.startsWith('xoxb-') || botToken.length <= 20) {
      toast.error('Please enter a valid Bot Token (starts with xoxb-)');
      return;
    }
    await onConnect(botToken);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isTokenValid = botToken.startsWith('xoxb-') && botToken.length > 20;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length} · {STEPS[currentStep].title}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step 0: Introduction */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-base">Give your product team visibility into customer issues</h3>
          <p className="text-sm text-muted-foreground">
            Connect your product or engineering team's Slack workspace to automatically receive customer support insights — without needing access to the support hub.
          </p>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">What your team will receive:</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <BarChart3 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Daily Digest</span>
                  <span className="text-muted-foreground"> — automated summary of conversation volume, trending topics, and customer sentiment every weekday morning</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Critical Alerts</span>
                  <span className="text-muted-foreground"> — real-time notifications when customers report payment failures, broken features, or urgent issues (in English and Norwegian)</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Separate workspace</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This connects a <strong>different</strong> Slack workspace than your support team's. You'll create a new Slack app in your product team's workspace.
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Create Slack App */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-base">Create a Slack App in your product workspace</h3>

          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs">1</div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Open the Slack API dashboard</p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">
                    Open Slack API <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs">2</div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Create New App → From scratch</p>
                <p className="text-xs text-muted-foreground">
                  Name it something like <code className="bg-muted px-1 rounded">"Support Alerts"</code>
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs">3</div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Select your product team's workspace</p>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 rounded text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Make sure you pick the <strong>product/engineering</strong> workspace, not the support workspace.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Scopes & Install */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-base">Add permissions & install</h3>

          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs">1</div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Add Bot Token Scopes</p>
                <p className="text-xs text-muted-foreground">
                  Go to <strong>OAuth & Permissions</strong> → scroll to <strong>Bot Token Scopes</strong> → add these:
                </p>
                <div className="space-y-1">
                  {REQUIRED_SCOPES.map((scope) => (
                    <div key={scope} className="flex items-center gap-2 text-xs">
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{scope}</code>
                      <span className="text-muted-foreground">
                        {scope === 'channels:read' && '— list public channels'}
                        {scope === 'groups:read' && '— list private channels'}
                        {scope === 'chat:write' && '— post digests & alerts'}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="xs" onClick={handleCopyScopes} className="gap-1">
                  <Copy className="h-3 w-3" /> Copy all scopes
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs">2</div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Install App to Workspace</p>
                <p className="text-xs text-muted-foreground">
                  Go to <strong>Install App</strong> in the sidebar → click <strong>Install to Workspace</strong> → authorize
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs">3</div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Copy the Bot User OAuth Token</p>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2 rounded">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                    Copy the token starting with <code className="bg-green-100 dark:bg-green-900 px-1 rounded">xoxb-</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Connect */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-base">Paste your token to connect</h3>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="secondary-bot-token" className="text-sm">Bot User OAuth Token</Label>
              <div className="relative">
                <Input
                  id="secondary-bot-token"
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="xoxb-your-token-here"
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {botToken && !botToken.startsWith('xoxb-') && (
                <p className="text-xs text-destructive">Token should start with xoxb-</p>
              )}
              {isTokenValid && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Token format looks valid
                </p>
              )}
            </div>

            <Button
              onClick={handleConnect}
              disabled={!isTokenValid || isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Slack className="h-4 w-4 mr-1.5" />
                  Connect Product Workspace
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Your token is securely stored and only used to post digest summaries and critical alerts.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-3 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        {currentStep < STEPS.length - 1 && (
          <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)}>
            Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

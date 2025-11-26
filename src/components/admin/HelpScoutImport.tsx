import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, CheckCircle2, XCircle, Loader2, AlertCircle, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { ImportHistory } from './ImportHistory';
import { useAuth } from '@/hooks/useAuth';

interface ImportProgress {
  totalMailboxes: number;
  totalConversations: number;
  conversationsImported: number;
  messagesImported: number;
  customersImported: number;
  errors: string[];
  status: 'idle' | 'running' | 'completed' | 'error';
}

interface HelpScoutMailbox {
  id: string;
  name: string;
  email: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Inbox {
  id: string;
  name: string;
}

type ImportStep = 'setup' | 'mapping' | 'importing';

export const HelpScoutImport = () => {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const [currentStep, setCurrentStep] = useState<ImportStep>('setup');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [mailboxes, setMailboxes] = useState<HelpScoutMailbox[]>([]);
  const [mailboxMapping, setMailboxMapping] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [isFetchingMailboxes, setIsFetchingMailboxes] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    totalMailboxes: 0,
    totalConversations: 0,
    conversationsImported: 0,
    messagesImported: 0,
    customersImported: 0,
    errors: [],
    status: 'idle',
  });
  const [currentMailboxName, setCurrentMailboxName] = useState<string>('');

  // Fetch organizations and set initial org
  useEffect(() => {
    const fetchData = async () => {
      if (isSuperAdmin) {
        const { data: orgs } = await supabase.from('organizations').select('id, name').order('name');
        setOrganizations(orgs || []);
      }
      
      const { data: userOrgId } = await supabase.rpc('get_user_organization_id');
      if (userOrgId) setSelectedOrgId(userOrgId);
    };
    fetchData();
  }, [isSuperAdmin]);

  // Fetch inboxes when organization changes
  useEffect(() => {
    const fetchInboxes = async () => {
      if (!selectedOrgId) return;
      
      const { data } = await supabase
        .from('inboxes')
        .select('id, name')
        .eq('organization_id', selectedOrgId)
        .order('name');
      
      setInboxes(data || []);
    };
    fetchInboxes();
  }, [selectedOrgId]);

  const handleTestConnection = async () => {
    if (!selectedOrgId) {
      toast({ title: 'Error', description: 'Please select an organization', variant: 'destructive' });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('helpscout-import', {
        body: { test: true, organizationId: selectedOrgId },
      });

      if (error) throw error;

      toast({
        title: 'Connection Successful',
        description: 'HelpScout credentials are valid and working.',
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to HelpScout. Check your credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchMailboxes = async () => {
    if (!selectedOrgId) {
      toast({ title: 'Error', description: 'Please select an organization', variant: 'destructive' });
      return;
    }

    setIsFetchingMailboxes(true);
    try {
      const { data, error } = await supabase.functions.invoke('helpscout-import', {
        body: { preview: true, organizationId: selectedOrgId },
      });

      if (error) throw error;

      setMailboxes(data.mailboxes || []);
      
      // Improved auto-mapping with fuzzy matching
      const autoMapping: Record<string, string> = {};
      
      data.mailboxes.forEach((mb: HelpScoutMailbox) => {
        // First try exact match
        let matchingInbox = inboxes.find(
          inbox => inbox.name.toLowerCase() === mb.name.toLowerCase()
        );
        
        // Then try fuzzy match (e.g., "Noddi Customer Service" matches "Noddi")
        if (!matchingInbox) {
          matchingInbox = inboxes.find(inbox => 
            mb.name.toLowerCase().includes(inbox.name.toLowerCase()) ||
            inbox.name.toLowerCase().includes(mb.name.toLowerCase())
          );
        }
        
        if (matchingInbox) {
          autoMapping[mb.id] = matchingInbox.id;
        } else if (inboxes.length === 1) {
          // If there's only one inbox, default to it
          autoMapping[mb.id] = inboxes[0].id;
        } else {
          autoMapping[mb.id] = 'create_new';
        }
      });
      setMailboxMapping(autoMapping);
      
      setCurrentStep('mapping');
      
      toast({
        title: 'Mailboxes Fetched',
        description: `Found ${data.mailboxes.length} mailboxes. Configure mapping below.`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Fetch Mailboxes',
        description: error.message || 'Could not retrieve mailboxes from HelpScout.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingMailboxes(false);
    }
  };

  const handleStartImport = async () => {
    if (!selectedOrgId) {
      toast({ title: 'Error', description: 'Please select an organization', variant: 'destructive' });
      return;
    }

    // Check if all mailboxes are mapped
    const unmappedMailboxes = mailboxes.filter(mb => !mailboxMapping[mb.id] || mailboxMapping[mb.id] === 'skip');
    if (unmappedMailboxes.length === mailboxes.length) {
      toast({
        title: 'No Mailboxes Selected',
        description: 'Please map at least one mailbox to an inbox.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setCurrentStep('importing');
    setProgress({
      totalMailboxes: 0,
      totalConversations: 0,
      conversationsImported: 0,
      messagesImported: 0,
      customersImported: 0,
      errors: [],
      status: 'running',
    });

    try {
      const { data, error } = await supabase.functions.invoke('helpscout-import', {
        body: {
          organizationId: selectedOrgId,
          mailboxMapping,
          dateFrom: dateFrom || undefined,
        },
      });

      if (error) throw error;

      if (data.status === 'started' && data.jobId) {
        setJobId(data.jobId);
        
        toast({
          title: 'Import Started',
          description: 'HelpScout data import is running in the background. Progress will update automatically.',
        });
        
        // Start polling for progress
        const pollInterval = setInterval(async () => {
          const { data: job, error: jobError } = await supabase
            .from('import_jobs')
            .select('*')
            .eq('id', data.jobId)
            .single();
          
          if (jobError) {
            console.error('Failed to fetch job progress:', jobError);
            return;
          }
          
          if (job) {
            // Extract current mailbox info from checkpoint
            const metadata = job.metadata as any;
            const checkpoint = metadata?.checkpoint;
            if (checkpoint && typeof checkpoint.currentMailboxIndex === 'number') {
              const currentMailbox = mailboxes[checkpoint.currentMailboxIndex];
              if (currentMailbox) {
                setCurrentMailboxName(currentMailbox.name);
              }
            }

            setProgress({
              totalMailboxes: job.total_mailboxes || 0,
              totalConversations: job.total_conversations || 0,
              conversationsImported: job.conversations_imported || 0,
              messagesImported: job.messages_imported || 0,
              customersImported: job.customers_imported || 0,
              errors: Array.isArray(job.errors) ? job.errors.map((e: any) => e.message || e) : [],
              status: job.status as 'idle' | 'running' | 'completed' | 'error'
            });
            
            // Handle paused status - it will auto-continue
            if (job.status === 'paused') {
              toast({
                title: 'Import Continuing',
                description: `Processed ${job.conversations_imported} conversations so far. Automatically continuing...`,
              });
              // Keep status as running in UI
              setProgress(prev => ({ ...prev, status: 'running' }));
            } else if (job.status === 'completed') {
              clearInterval(pollInterval);
              setIsImporting(false);
              setCurrentMailboxName('');
              toast({
                title: 'Import Complete',
                description: `Successfully imported ${job.conversations_imported} conversations with ${job.messages_imported} messages.`,
              });
            } else if (job.status === 'error') {
              clearInterval(pollInterval);
              setIsImporting(false);
              setCurrentMailboxName('');
              toast({
                title: 'Import Failed',
                description: 'The import encountered errors. Check the error log below.',
                variant: 'destructive',
              });
            }
          }
        }, 3000); // Poll every 3 seconds
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, error.message],
      }));
      setIsImporting(false);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to start import. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const progressPercentage =
    progress.totalConversations > 0
      ? Math.round((progress.conversationsImported / progress.totalConversations) * 100)
      : 0;

  const handleResumeImport = async (pausedJobId: string) => {
    setIsImporting(true);
    try {
      // Don't pass organizationId - backend will fetch from job record
      const { data, error } = await supabase.functions.invoke('helpscout-import', {
        body: {
          resume: true,
          jobId: pausedJobId,
        },
      });

      if (error) {
        console.error('Resume error:', error);
        throw error;
      }

      setJobId(pausedJobId);
      setCurrentStep('importing');
      setProgress(prev => ({ ...prev, status: 'running' }));

      toast({
        title: 'Import Resumed',
        description: 'Continuing import from where it left off...',
      });

      // Start polling for progress (same as regular import)
      const pollInterval = setInterval(async () => {
        const { data: job, error: jobError } = await supabase
          .from('import_jobs')
          .select('*')
          .eq('id', pausedJobId)
          .single();
        
        if (jobError) {
          console.error('Failed to fetch job progress:', jobError);
          return;
        }
        
        if (job) {
          const metadata = job.metadata as any;
          const checkpoint = metadata?.checkpoint;
          if (checkpoint && typeof checkpoint.currentMailboxIndex === 'number') {
            const currentMailbox = mailboxes[checkpoint.currentMailboxIndex];
            if (currentMailbox) {
              setCurrentMailboxName(currentMailbox.name);
            }
          }

          setProgress({
            totalMailboxes: job.total_mailboxes || 0,
            totalConversations: job.total_conversations || 0,
            conversationsImported: job.conversations_imported || 0,
            messagesImported: job.messages_imported || 0,
            customersImported: job.customers_imported || 0,
            errors: Array.isArray(job.errors) ? job.errors.map((e: any) => e.message || e) : [],
            status: job.status as 'idle' | 'running' | 'completed' | 'error'
          });
          
          if (job.status === 'paused') {
            setProgress(prev => ({ ...prev, status: 'running' }));
          } else if (job.status === 'completed') {
            clearInterval(pollInterval);
            setIsImporting(false);
            setCurrentMailboxName('');
            toast({
              title: 'Import Complete',
              description: `Successfully imported ${job.conversations_imported} conversations with ${job.messages_imported} messages.`,
            });
          } else if (job.status === 'error') {
            clearInterval(pollInterval);
            setIsImporting(false);
            setCurrentMailboxName('');
            toast({
              title: 'Import Failed',
              description: 'The import encountered errors. Check the error log below.',
              variant: 'destructive',
            });
          }
        }
      }, 3000);
    } catch (error: any) {
      console.error('Resume failed:', error);
      setIsImporting(false);
      toast({
        title: 'Failed to Resume',
        description: error.message || 'Could not resume import. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Download className="w-5 h-5" />
            HelpScout Import
          </CardTitle>
          <CardDescription>
            Import your historical conversation data from HelpScout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credentials Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              HelpScout API credentials are configured as Supabase secrets. Make sure you've added
              <strong> HELPSCOUT_APP_ID</strong> and <strong>HELPSCOUT_APP_SECRET</strong> with valid credentials from your HelpScout developer console.
            </AlertDescription>
          </Alert>

          {/* Step 1: Organization Selection */}
          {currentStep === 'setup' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="organization">Target Organization</Label>
                {isSuperAdmin && organizations.length > 0 ? (
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger id="organization">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={selectedOrgId} disabled className="bg-muted" />
                )}
                <p className="text-xs text-muted-foreground">
                  All imported data will be assigned to this organization
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="dateFrom">Import From Date (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="Leave empty to import all history"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to import all historical data, or select a date to limit the import
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting || !selectedOrgId}
                  variant="outline"
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleFetchMailboxes}
                  disabled={isFetchingMailboxes || !selectedOrgId}
                  className="flex-1"
                >
                  {isFetchingMailboxes ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Next: Fetch Mailboxes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Mailbox Mapping */}
          {currentStep === 'mapping' && (
            <div className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Map each HelpScout mailbox to a target inbox in your organization. You can create new inboxes or skip mailboxes you don't want to import.
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HelpScout Mailbox</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Target Inbox</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mailboxes.map((mailbox) => (
                      <TableRow key={mailbox.id}>
                        <TableCell className="font-medium">{mailbox.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{mailbox.email}</TableCell>
                        <TableCell>
                          <Select
                            value={mailboxMapping[mailbox.id] || ''}
                            onValueChange={(value) =>
                              setMailboxMapping((prev) => ({ ...prev, [mailbox.id]: value }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select target inbox" />
                            </SelectTrigger>
                            <SelectContent>
                              {mailboxMapping[mailbox.id] === 'create_new' && (
                                <SelectItem value="create_new">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="font-medium">Create new inbox: "{mailbox.name}"</span>
                                  </div>
                                </SelectItem>
                              )}
                              {inboxes.map((inbox) => (
                                <SelectItem key={inbox.id} value={inbox.id}>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    <span>{inbox.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {mailboxMapping[mailbox.id] !== 'create_new' && (
                                <SelectItem value="create_new">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Create new inbox: "{mailbox.name}"</span>
                                  </div>
                                </SelectItem>
                              )}
                              <SelectItem value="skip">⏭️ Skip - don't import</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setCurrentStep('setup');
                    setMailboxes([]);
                    setMailboxMapping({});
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>

                <Button onClick={handleStartImport} disabled={isImporting} className="flex-1">
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Start Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Import Progress */}
          {currentStep === 'importing' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Import Progress</span>
                  <span className="text-muted-foreground">
                    {progress.conversationsImported} / {progress.totalConversations} conversations
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Current Mailbox */}
              {currentMailboxName && (
                <p className="text-xs text-muted-foreground">
                  Currently processing: <strong>{currentMailboxName}</strong>
                </p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Mailboxes</p>
                  <p className="text-2xl font-bold text-primary">{progress.totalMailboxes}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Conversations</p>
                  <p className="text-2xl font-bold text-primary">{progress.conversationsImported}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold text-primary">{progress.messagesImported}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold text-primary">{progress.customersImported}</p>
                </div>
              </div>

              {/* Status */}
              {progress.status === 'completed' && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    Import completed successfully! All data has been imported.
                  </AlertDescription>
                </Alert>
              )}

              {progress.status === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import encountered errors. Check the error log below.
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-destructive">Errors ({progress.errors.length})</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {progress.errors.map((error, idx) => (
                      <div key={idx} className="flex gap-2">
                        <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start New Import Button */}
              {(progress.status === 'completed' || progress.status === 'error' || (progress.status === 'idle' && !isImporting)) && (
                <Button
                  onClick={() => {
                    setCurrentStep('setup');
                    setMailboxes([]);
                    setMailboxMapping({});
                    setJobId('');
                    setCurrentMailboxName('');
                    setProgress({
                      totalMailboxes: 0,
                      totalConversations: 0,
                      conversationsImported: 0,
                      messagesImported: 0,
                      customersImported: 0,
                      errors: [],
                      status: 'idle',
                    });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Start New Import
                </Button>
              )}
            </div>
          )}

          {/* Instructions */}
          {currentStep === 'setup' && !isFetchingMailboxes && (
            <div className="space-y-3 pt-4 border-t text-sm text-muted-foreground">
              <h4 className="font-medium text-foreground">How it works:</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>Select the target organization for imported data</li>
                <li>Test your HelpScout API connection to verify credentials</li>
                <li>Fetch mailboxes to see what's available for import</li>
                <li>Map each HelpScout mailbox to a target inbox in your organization</li>
                <li>Start the import - it runs in the background and may take 5-15 minutes</li>
                <li>All mapped conversations and messages will be imported</li>
                <li>Customers will be automatically created and matched by email</li>
                <li>The import is idempotent - you can safely run it multiple times</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">Setup Instructions</CardTitle>
          <CardDescription>How to get your HelpScout API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to HelpScout → Your Profile → My Apps</li>
            <li>Click "Create App" and select "OAuth2 Application"</li>
            <li>Enter app name (e.g., "Lovable Import")</li>
            <li>
              Set redirect URL to: <code className="bg-muted px-1 py-0.5 rounded">https://qgfaycwsangsqzpveoup.lovable.app</code>
            </li>
            <li>Copy your App ID and App Secret</li>
            <li>Add them as secrets in your Lovable Cloud environment</li>
          </ol>
        </CardContent>
      </Card>

      {/* Import History */}
      <ImportHistory onResume={handleResumeImport} />
    </div>
  );
};

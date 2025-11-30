import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ValidationCheck {
  id: string;
  label: string;
  status: 'checking' | 'passed' | 'warning' | 'failed';
  message?: string;
}

interface PreImportValidationProps {
  organizationId: string;
  mailboxMapping: Record<string, string>;
  onValidationComplete?: (allPassed: boolean) => void;
}

export const PreImportValidation = ({ organizationId, mailboxMapping, onValidationComplete }: PreImportValidationProps) => {
  const [checks, setChecks] = useState<ValidationCheck[]>([
    { id: 'org', label: 'Target organization exists', status: 'checking' },
    { id: 'creds', label: 'HelpScout credentials configured', status: 'checking' },
    { id: 'mapping', label: 'At least one mailbox mapped', status: 'checking' },
    { id: 'inboxes', label: 'Target inboxes available', status: 'checking' },
    { id: 'conflicts', label: 'No existing import conflicts', status: 'checking' },
  ]);

  useEffect(() => {
    runValidation();
  }, [organizationId, mailboxMapping]);

  const runValidation = async () => {
    const newChecks = [...checks];

    // Check 1: Organization exists
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .single();
      
      updateCheck(newChecks, 'org', org ? 'passed' : 'failed', org ? undefined : 'Organization not found');
    } catch {
      updateCheck(newChecks, 'org', 'failed', 'Could not verify organization');
    }

    // Check 2: HelpScout credentials (test via edge function)
    try {
      const { error } = await supabase.functions.invoke('helpscout-import', {
        body: { test: true },
      });
      
      updateCheck(newChecks, 'creds', error ? 'failed' : 'passed', error ? 'Invalid credentials' : undefined);
    } catch {
      updateCheck(newChecks, 'creds', 'warning', 'Could not test credentials - may still work');
    }

    // Check 3: Mailbox mapping
    const mappedMailboxes = Object.values(mailboxMapping).filter(v => v && v !== 'skip');
    if (mappedMailboxes.length === 0) {
      updateCheck(newChecks, 'mapping', 'failed', 'No mailboxes selected for import');
    } else if (mappedMailboxes.length < Object.keys(mailboxMapping).length / 2) {
      updateCheck(newChecks, 'mapping', 'warning', `Only ${mappedMailboxes.length} of ${Object.keys(mailboxMapping).length} mailboxes mapped`);
    } else {
      updateCheck(newChecks, 'mapping', 'passed', `${mappedMailboxes.length} mailboxes mapped`);
    }

    // Check 4: Target inboxes
    try {
      const { data: inboxes } = await supabase
        .from('inboxes')
        .select('id')
        .eq('organization_id', organizationId);
      
      const newInboxesCount = Object.values(mailboxMapping).filter(v => v === 'create_new').length;
      updateCheck(newChecks, 'inboxes', 'passed', `${inboxes?.length || 0} existing + ${newInboxesCount} new`);
    } catch {
      updateCheck(newChecks, 'inboxes', 'warning', 'Could not verify inboxes');
    }

    // Check 5: Existing conflicts (check for recent imports)
    try {
      const { data: recentJobs } = await supabase
        .from('import_jobs')
        .select('id, status, created_at')
        .eq('organization_id', organizationId)
        .eq('source', 'helpscout')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      const runningJob = recentJobs?.find(j => j.status === 'running' || j.status === 'paused');
      if (runningJob) {
        updateCheck(newChecks, 'conflicts', 'warning', 'Another import is currently running');
      } else if (recentJobs && recentJobs.length > 0) {
        updateCheck(newChecks, 'conflicts', 'warning', `${recentJobs.length} imports in last 24h (idempotent)`);
      } else {
        updateCheck(newChecks, 'conflicts', 'passed', 'No recent imports detected');
      }
    } catch {
      updateCheck(newChecks, 'conflicts', 'passed', 'Could not check for conflicts');
    }

    setChecks(newChecks);
    
    // Notify parent
    const allPassed = newChecks.every(c => c.status === 'passed' || c.status === 'warning');
    onValidationComplete?.(allPassed);
  };

  const updateCheck = (checks: ValidationCheck[], id: string, status: ValidationCheck['status'], message?: string) => {
    const check = checks.find(c => c.id === id);
    if (check) {
      check.status = status;
      check.message = message;
    }
  };

  const failedChecks = checks.filter(c => c.status === 'failed');
  const warningChecks = checks.filter(c => c.status === 'warning');
  const allChecking = checks.every(c => c.status === 'checking');

  return (
    <Card className="bg-gradient-surface border-border/50">
      <CardHeader>
        <CardTitle className="text-primary">Pre-Import Validation</CardTitle>
        <CardDescription>
          Verifying configuration before starting import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {checks.map(check => (
            <div key={check.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="shrink-0 mt-0.5">
                {check.status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {check.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                {check.status === 'failed' && <XCircle className="w-4 h-4 text-destructive" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{check.label}</p>
                {check.message && (
                  <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {failedChecks.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {failedChecks.length} critical validation {failedChecks.length === 1 ? 'check' : 'checks'} failed. 
              Please fix these issues before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {failedChecks.length === 0 && warningChecks.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {warningChecks.length} validation {warningChecks.length === 1 ? 'warning' : 'warnings'} detected. 
              You can proceed, but review the warnings first.
            </AlertDescription>
          </Alert>
        )}

        {!allChecking && failedChecks.length === 0 && warningChecks.length === 0 && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              All validation checks passed! Ready to start import.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

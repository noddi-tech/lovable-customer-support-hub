import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Clock, History, RefreshCw, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ImportJob {
  id: string;
  source: string;
  status: string;
  total_mailboxes: number;
  total_conversations: number;
  conversations_imported: number;
  messages_imported: number;
  customers_imported: number;
  errors: any[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
  metadata?: {
    currentPage?: number;
    currentMailboxId?: string;
    currentMailboxName?: string;
    continuationCount?: number;
    completedMailboxIds?: string[];
  };
}

interface ImportHistoryProps {
  onResume?: (jobId: string) => void;
}

export const ImportHistory = ({ onResume }: ImportHistoryProps = {}) => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setJobs(data as ImportJob[]);
      setLastUpdated(new Date());
    }
    setIsLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, []);

  // Polling for active jobs
  useEffect(() => {
    const hasActiveJob = jobs.some(
      job => job.status === 'running' || job.status === 'paused'
    );

    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobs]);

  const handleMarkAsError = async (jobId: string) => {
    setUpdatingJobId(jobId);
    try {
      const { error } = await supabase.functions.invoke('manage-import-job', {
        body: { 
          jobId, 
          action: 'mark_error',
          errorMessage: 'Import timed out - CPU time limit exceeded. Marked as error by user.'
        }
      });

      if (error) throw error;

      toast({
        title: "Job marked as error",
        description: "You can now restart the import fresh"
      });

      // Refresh the jobs list
      const { data } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setJobs(data as ImportJob[]);
    } catch (error) {
      console.error('Failed to mark job as error:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive"
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleResumeJob = async (jobId: string) => {
    if (onResume) {
      setResumingJobId(jobId);
      try {
        await onResume(jobId);
      } finally {
        setResumingJobId(null);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-500/10 text-blue-700 border-blue-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="default" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Paused (auto-resuming)
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const calculateProgress = (job: ImportJob): number => {
    if (job.total_conversations === 0) return 0;
    return Math.round((job.conversations_imported / job.total_conversations) * 100);
  };

  const activeJob = jobs.find(job => job.status === 'running' || job.status === 'paused');

  if (isLoading) {
    return (
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <History className="w-5 h-5" />
            Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <History className="w-5 h-5" />
              Import History
            </CardTitle>
            <CardDescription>View past import jobs and their status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active Import Live Stats */}
        {activeJob && (
          <Card className="mb-4 bg-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                <Activity className="w-4 h-4 animate-pulse" />
                Active Import - Live Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Conversations</p>
                  <p className="text-2xl font-bold text-foreground">
                    {activeJob.conversations_imported.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {activeJob.total_conversations.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold text-foreground">
                    {activeJob.messages_imported.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold text-foreground">
                    {activeJob.customers_imported.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {calculateProgress(activeJob)}%
                  </p>
                </div>
              </div>
              
              {activeJob.metadata && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    {activeJob.metadata.currentMailboxName && (
                      <span>
                        <strong className="text-foreground">Mailbox:</strong> {activeJob.metadata.currentMailboxName}
                      </span>
                    )}
                    {activeJob.metadata.currentPage && (
                      <span>
                        <strong className="text-foreground">Page:</strong> {activeJob.metadata.currentPage}
                      </span>
                    )}
                    {activeJob.metadata.continuationCount !== undefined && (
                      <span>
                        <strong className="text-foreground">Continuation:</strong> {activeJob.metadata.continuationCount} / 150
                      </span>
                    )}
                    {activeJob.metadata.completedMailboxIds && (
                      <span>
                        <strong className="text-foreground">Completed Mailboxes:</strong> {activeJob.metadata.completedMailboxIds.length} / {activeJob.total_mailboxes}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium text-foreground">{calculateProgress(activeJob)}%</span>
                </div>
                <Progress value={calculateProgress(activeJob)} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
          <p className="text-sm text-muted-foreground text-center py-8">
            No import jobs found. Start your first import above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <History className="w-5 h-5" />
          Import History
        </CardTitle>
        <CardDescription>View past import jobs and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const isActive = job.status === 'running' || job.status === 'paused';
                const progress = calculateProgress(job);
                
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium capitalize">{job.source}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>
                          {job.conversations_imported.toLocaleString()}
                          {job.total_conversations > 0 && (
                            <span className="text-muted-foreground"> / {job.total_conversations.toLocaleString()}</span>
                          )}
                        </div>
                        {isActive && job.total_conversations > 0 && (
                          <div className="space-y-0.5">
                            <Progress value={progress} className="h-1" />
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.messages_imported.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.customers_imported.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.started_at
                      ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                      : 'Not started'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.completed_at && job.started_at
                      ? `${Math.round(
                          (new Date(job.completed_at).getTime() -
                            new Date(job.started_at).getTime()) /
                            60000
                        )}m`
                      : job.status === 'running'
                      ? 'In progress'
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {job.status === 'running' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsError(job.id)}
                        disabled={updatingJobId === job.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {updatingJobId === job.id ? 'Updating...' : 'Mark as Error'}
                      </Button>
                    )}
                    {job.status === 'paused' && onResume && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeJob(job.id)}
                        disabled={resumingJobId === job.id}
                      >
                        {resumingJobId === job.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4 mr-1" />
                        )}
                        {resumingJobId === job.id ? 'Resuming...' : 'Resume Now'}
                      </Button>
                    )}
                    {job.status === 'error' && onResume && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeJob(job.id)}
                        disabled={resumingJobId === job.id}
                      >
                        {resumingJobId === job.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        {resumingJobId === job.id ? 'Resuming...' : 'Retry Import'}
                      </Button>
                    )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

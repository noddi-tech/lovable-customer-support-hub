import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Clock, History } from 'lucide-react';
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
}

interface ImportHistoryProps {
  onResume?: (jobId: string) => void;
}

export const ImportHistory = ({ onResume }: ImportHistoryProps = {}) => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setJobs(data as ImportJob[]);
      }
      setIsLoading(false);
    };

    fetchJobs();
  }, []);

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
      onResume(jobId);
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
          <Badge variant="default" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="default" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
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
          <CardTitle className="flex items-center gap-2 text-primary">
            <History className="w-5 h-5" />
            Import History
          </CardTitle>
          <CardDescription>View past import jobs and their status</CardDescription>
        </CardHeader>
        <CardContent>
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
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium capitalize">{job.source}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.conversations_imported}
                    {job.total_conversations > 0 && (
                      <span className="text-muted-foreground"> / {job.total_conversations}</span>
                    )}
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
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Resume Now
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

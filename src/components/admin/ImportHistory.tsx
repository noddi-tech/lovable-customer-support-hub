import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Clock, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

export const ImportHistory = () => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

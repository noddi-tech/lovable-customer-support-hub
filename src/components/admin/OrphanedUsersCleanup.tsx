import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, RefreshCw, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OrphanedUser {
  id: string;
  email: string;
  created_at: string;
}

export function OrphanedUsersCleanup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orphaned-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-cleanup-users', {
        method: 'GET',
      });

      if (error) throw new Error(error.message);
      return data as {
        orphaned_users: OrphanedUser[];
        total_auth_users: number;
        total_profiles: number;
      };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('admin-cleanup-users', {
        method: 'POST',
        body: { action: 'delete', user_ids: userIds },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orphaned-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: 'Cleanup complete',
        description: `Deleted ${result.deleted_count} orphaned users. ${result.error_count > 0 ? `${result.error_count} errors.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Cleanup failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const orphanedUsers = data?.orphaned_users || [];

  const handleDeleteAll = () => {
    if (orphanedUsers.length > 0) {
      deleteMutation.mutate(orphanedUsers.map(u => u.id));
    }
    setShowConfirmDialog(false);
  };

  if (isLoading) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">Loading orphaned users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={orphanedUsers.length > 0 ? 'border-destructive/50 bg-destructive/5' : 'border-muted'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">Orphaned Auth Users</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Users in auth.users without corresponding profiles (incomplete registration)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span>Total auth users: <strong>{data?.total_auth_users || 0}</strong></span>
            <span>Total profiles: <strong>{data?.total_profiles || 0}</strong></span>
            <Badge variant={orphanedUsers.length > 0 ? 'destructive' : 'secondary'}>
              {orphanedUsers.length} orphaned
            </Badge>
          </div>

          {orphanedUsers.length > 0 ? (
            <>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-background">
                {orphanedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground truncate">{user.email || user.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteMutation.isPending ? 'Deleting...' : `Delete All (${orphanedUsers.length})`}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No orphaned users found. All auth users have profiles.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {orphanedUsers.length} Orphaned Users?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {orphanedUsers.length} auth user(s) without profiles.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';
import type { ServiceTicket } from '@/types/service-tickets';
import type { TeamMember } from '@/hooks/useTeamMembers';

interface TeamWorkloadStatsProps {
  tickets: ServiceTicket[];
  teamMembers: TeamMember[];
}

export const TeamWorkloadStats = ({ tickets, teamMembers }: TeamWorkloadStatsProps) => {
  const workloadData = useMemo(() => {
    const activeTickets = tickets.filter(
      t => !['completed', 'closed', 'cancelled'].includes(t.status)
    );

    const memberWorkloads = teamMembers.map(member => {
      const assignedTickets = activeTickets.filter(
        t => t.assigned_to_id === member.user_id
      );
      
      const urgentCount = assignedTickets.filter(t => t.priority === 'urgent').length;
      const highCount = assignedTickets.filter(t => t.priority === 'high').length;
      
      return {
        member,
        totalTickets: assignedTickets.length,
        urgentCount,
        highCount,
        tickets: assignedTickets,
      };
    });

    const unassignedCount = activeTickets.filter(t => !t.assigned_to_id).length;
    const maxTickets = Math.max(...memberWorkloads.map(w => w.totalTickets), 1);

    return {
      memberWorkloads: memberWorkloads.sort((a, b) => b.totalTickets - a.totalTickets),
      unassignedCount,
      maxTickets,
    };
  }, [tickets, teamMembers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workloadData.unassignedCount > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Unassigned Tickets</span>
              <Badge variant="secondary">{workloadData.unassignedCount}</Badge>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {workloadData.memberWorkloads.map(({ member, totalTickets, urgentCount, highCount }) => (
            <div key={member.user_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-xs">
                      {member.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{member.full_name}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {urgentCount > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {urgentCount} urgent
                        </span>
                      )}
                      {urgentCount > 0 && highCount > 0 && <span>•</span>}
                      {highCount > 0 && (
                        <span className="text-orange-600 dark:text-orange-400">
                          {highCount} high
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant={totalTickets > 10 ? 'destructive' : 'secondary'}>
                  {totalTickets}
                </Badge>
              </div>
              <Progress 
                value={(totalTickets / workloadData.maxTickets) * 100} 
                className="h-1.5"
              />
            </div>
          ))}
        </div>

        {workloadData.memberWorkloads.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members available
          </p>
        )}
      </CardContent>
    </Card>
  );
};

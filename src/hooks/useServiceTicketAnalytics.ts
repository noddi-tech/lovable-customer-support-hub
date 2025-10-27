import { useMemo } from 'react';
import type { ServiceTicket } from '@/types/service-tickets';

export interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  avgResolutionTimeHours: number;
  avgFirstResponseTimeHours: number;
  overdueTickets: number;
  slaBreachRate: number;
  ticketsByPriority: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  ticketsByStatus: Record<string, number>;
  ticketsByCategory: Record<string, number>;
  completionRate: number;
  recentTrends: {
    newThisWeek: number;
    closedThisWeek: number;
    avgResponseTime: number;
  };
}

export const useServiceTicketAnalytics = (tickets: ServiceTicket[]): TicketAnalytics => {
  return useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const openTickets = tickets.filter(t => 
      !['completed', 'closed', 'cancelled'].includes(t.status)
    );
    
    const closedTickets = tickets.filter(t => 
      ['completed', 'closed'].includes(t.status)
    );

    const overdueTickets = tickets.filter(t => 
      t.due_date && 
      new Date(t.due_date) < now && 
      !['completed', 'closed', 'cancelled'].includes(t.status)
    );

    // Calculate average resolution time
    const ticketsWithResolution = closedTickets.filter(t => 
      t.completed_at && t.created_at
    );
    const avgResolutionTimeHours = ticketsWithResolution.length > 0
      ? ticketsWithResolution.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime();
          const completed = new Date(t.completed_at!).getTime();
          return sum + (completed - created) / (1000 * 60 * 60);
        }, 0) / ticketsWithResolution.length
      : 0;

    // Calculate average first response time
    const ticketsWithResponse = tickets.filter(t => 
      t.first_response_at && t.created_at
    );
    const avgFirstResponseTimeHours = ticketsWithResponse.length > 0
      ? ticketsWithResponse.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime();
          const responded = new Date(t.first_response_at!).getTime();
          return sum + (responded - created) / (1000 * 60 * 60);
        }, 0) / ticketsWithResponse.length
      : 0;

    // SLA breach rate
    const ticketsWithDueDate = tickets.filter(t => t.due_date);
    const breachedTickets = ticketsWithDueDate.filter(t => {
      const dueDate = new Date(t.due_date!);
      const completedAt = t.completed_at ? new Date(t.completed_at) : now;
      return completedAt > dueDate;
    });
    const slaBreachRate = ticketsWithDueDate.length > 0
      ? (breachedTickets.length / ticketsWithDueDate.length) * 100
      : 0;

    // Priority breakdown
    const ticketsByPriority = {
      urgent: tickets.filter(t => t.priority === 'urgent').length,
      high: tickets.filter(t => t.priority === 'high').length,
      normal: tickets.filter(t => t.priority === 'normal').length,
      low: tickets.filter(t => t.priority === 'low').length,
    };

    // Status breakdown
    const ticketsByStatus = tickets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category breakdown
    const ticketsByCategory = tickets.reduce((acc, t) => {
      if (t.category) {
        acc[t.category] = (acc[t.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Completion rate
    const completionRate = tickets.length > 0
      ? (closedTickets.length / tickets.length) * 100
      : 0;

    // Recent trends
    const recentTickets = tickets.filter(t => 
      new Date(t.created_at) >= oneWeekAgo
    );
    const recentClosed = closedTickets.filter(t => 
      t.completed_at && new Date(t.completed_at) >= oneWeekAgo
    );
    const recentWithResponse = recentTickets.filter(t => t.first_response_at);
    const avgResponseTime = recentWithResponse.length > 0
      ? recentWithResponse.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime();
          const responded = new Date(t.first_response_at!).getTime();
          return sum + (responded - created) / (1000 * 60 * 60);
        }, 0) / recentWithResponse.length
      : 0;

    return {
      totalTickets: tickets.length,
      openTickets: openTickets.length,
      closedTickets: closedTickets.length,
      avgResolutionTimeHours,
      avgFirstResponseTimeHours,
      overdueTickets: overdueTickets.length,
      slaBreachRate,
      ticketsByPriority,
      ticketsByStatus,
      ticketsByCategory,
      completionRate,
      recentTrends: {
        newThisWeek: recentTickets.length,
        closedThisWeek: recentClosed.length,
        avgResponseTime,
      },
    };
  }, [tickets]);
};

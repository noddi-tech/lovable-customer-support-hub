import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface AgentStat {
  id: string;
  name: string;
  avatar?: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  answerRate: number;
  satisfaction?: number;
}

interface AgentPerformanceTableProps {
  data: AgentStat[];
}

export const AgentPerformanceTable = ({ data }: AgentPerformanceTableProps) => {
  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge variant="default" className="bg-success">Excellent</Badge>;
    if (rate >= 75) return <Badge variant="default">Good</Badge>;
    if (rate >= 60) return <Badge variant="secondary">Average</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Total Calls</TableHead>
              <TableHead className="text-right">Answered</TableHead>
              <TableHead className="text-right">Missed</TableHead>
              <TableHead className="text-right">Avg Duration</TableHead>
              <TableHead className="text-right">Answer Rate</TableHead>
              <TableHead className="text-right">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback>
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{agent.totalCalls}</TableCell>
                <TableCell className="text-right">{agent.answeredCalls}</TableCell>
                <TableCell className="text-right text-muted-foreground">{agent.missedCalls}</TableCell>
                <TableCell className="text-right">{Math.floor(agent.avgDuration / 60)}m {agent.avgDuration % 60}s</TableCell>
                <TableCell className="text-right">{agent.answerRate}%</TableCell>
                <TableCell className="text-right">
                  {getPerformanceBadge(agent.answerRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

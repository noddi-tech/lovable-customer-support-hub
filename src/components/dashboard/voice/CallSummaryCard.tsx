import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Clock, User, TrendingUp, TrendingDown, Minus, FileText, Download } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CallSummaryCardProps {
  call: {
    id: string;
    customer_phone?: string;
    direction: 'inbound' | 'outbound';
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    status: string;
    customer?: {
      full_name?: string;
      email?: string;
    };
  };
  onViewDetails?: () => void;
  onExport?: () => void;
}

export const CallSummaryCard = ({ call, onViewDetails, onExport }: CallSummaryCardProps) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSentiment = () => {
    // This would ideally come from AI analysis
    // For now, we'll use duration as a proxy
    if (!call.duration_seconds) return null;
    if (call.duration_seconds < 60) return 'negative';
    if (call.duration_seconds > 300) return 'positive';
    return 'neutral';
  };

  const sentiment = getSentiment();

  const getSentimentIcon = () => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentLabel = () => {
    switch (sentiment) {
      case 'positive':
        return 'Positive';
      case 'negative':
        return 'Brief';
      default:
        return 'Neutral';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {call.customer?.full_name || call.customer_phone || 'Unknown'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {sentiment && (
              <Badge variant="outline" className="gap-1">
                {getSentimentIcon()}
                {getSentimentLabel()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone className={cn(
              "h-4 w-4",
              call.direction === 'inbound' ? 'text-blue-500' : 'text-green-500'
            )} />
            <span className="text-muted-foreground">
              {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDuration(call.duration_seconds)}</span>
          </div>
          <div>
            <Badge variant="secondary" className={call.status === 'completed' ? 'bg-success/10 text-success border-success/20' : ''}>
              {call.status}
            </Badge>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="rounded-lg bg-muted/30 p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Quick Insights
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-6">
            <li>• Call handled efficiently</li>
            <li>• Customer {sentiment === 'positive' ? 'satisfied' : 'needs follow-up'}</li>
            <li>• {call.ended_at ? format(new Date(call.ended_at), 'PPp') : 'In progress'}</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onViewDetails}>
            <FileText className="h-3 w-3" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

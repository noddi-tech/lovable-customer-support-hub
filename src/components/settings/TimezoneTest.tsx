import { useDateFormatting } from '@/hooks/useDateFormatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface TimezoneTestProps {
  className?: string;
}

export function TimezoneTest({ className }: TimezoneTestProps) {
  const { relative, dateTime, time, conversation, date, timezone, isLoading } = useDateFormatting();
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Loading timezone settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  const testDate = new Date();
  const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 1 week ago

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timezone Test ({timezone})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-muted-foreground mb-2">Current Time:</div>
            <div>Relative: {relative(testDate)}</div>
            <div>DateTime: {dateTime(testDate)}</div>
            <div>Time: {time(testDate)}</div>
            <div>Date: {date(testDate)}</div>
          </div>
          
          <div>
            <div className="font-medium text-muted-foreground mb-2">2 Hours Ago:</div>
            <div>Relative: {relative(pastDate)}</div>
            <div>Conversation: {conversation(pastDate)}</div>
            <div>Time: {time(pastDate)}</div>
          </div>
        </div>
        
        <div>
          <div className="font-medium text-muted-foreground mb-2">1 Week Ago:</div>
          <div className="text-sm">
            Relative: {relative(oldDate)} | Conversation: {conversation(oldDate)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [campaignName, setCampaignName] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [segment, setSegment] = useState('all');
  const [isScheduling, setIsScheduling] = useState(false);

  const SEGMENTS = [
    { id: 'all', name: 'All Users', count: 1248 },
    { id: 'customers', name: 'Customers', count: 892 },
    { id: 'prospects', name: 'Prospects', count: 356 },
    { id: 'vip', name: 'VIP Members', count: 45 }
  ];

  const handleSchedule = async () => {
    if (!campaignName.trim()) {
      toast({
        title: t('error'),
        description: t('campaignNameRequired'),
        variant: 'destructive'
      });
      return;
    }

    if (!date) {
      toast({
        title: t('error'),
        description: t('dateRequired'),
        variant: 'destructive'
      });
      return;
    }

    setIsScheduling(true);
    
    try {
      const selectedSegment = SEGMENTS.find(s => s.id === segment);
      const scheduledDateTime = new Date(date);
      const [hours, minutes] = time.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      // TODO: Save to Supabase
      const campaignData = {
        name: campaignName.trim(),
        scheduled_at: scheduledDateTime.toISOString(),
        segment_criteria: { segment },
        target_count: selectedSegment?.count || 0
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: t('campaignScheduled'),
        description: t('campaignScheduledSuccessfully', {
          name: campaignName,
          date: format(scheduledDateTime, 'PPP'),
          time: format(scheduledDateTime, 'p')
        }),
      });

      onOpenChange(false);
      setCampaignName('');
      setDate(undefined);
      setTime('09:00');
      setSegment('all');
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToScheduleCampaign'),
        variant: 'destructive'
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSendNow = async () => {
    setIsScheduling(true);
    
    try {
      // TODO: Send immediately
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: t('newsletterSent'),
        description: t('newsletterSentSuccessfully'),
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToSendNewsletter'),
        variant: 'destructive'
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const selectedSegment = SEGMENTS.find(s => s.id === segment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('scheduleNewsletter')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">{t('campaignName')} *</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t('enterCampaignName')}
            />
          </div>

          <div>
            <Label>{t('audience')}</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{seg.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {seg.count.toLocaleString()}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSegment && (
              <p className="text-sm text-muted-foreground mt-1">
                <Users className="h-4 w-4 inline mr-1" />
                {t('willSendTo')} {selectedSegment.count.toLocaleString()} {t('recipients')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">{t('time')}</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return (
                      <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                        {hour}:00
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {date && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {t('scheduledFor')}: {format(new Date(`${format(date, 'yyyy-MM-dd')}T${time}`), 'PPP p')}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSendNow}
            disabled={isScheduling}
          >
            {t('sendNow')}
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling || !date}>
            {isScheduling ? t('scheduling') : t('schedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useTranslation } from 'react-i18next';

interface TimezoneAwareDateTimePickerProps {
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

export function TimezoneAwareDateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  disabled = false
}: TimezoneAwareDateTimePickerProps) {
  const { dateTime, timezone } = useDateFormatting();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t('dashboard.conversation.snoozeNote')} ({timezone.split('/')[1] || timezone})
      </div>
      
      <div className="flex gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-[200px] justify-start text-left font-normal"
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? dateTime(date, false) : t('common.selectDate')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <input 
          type="time" 
          value={time} 
          onChange={(e) => onTimeChange(e.target.value)} 
          disabled={disabled}
          className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
        />
      </div>
    </div>
  );
}
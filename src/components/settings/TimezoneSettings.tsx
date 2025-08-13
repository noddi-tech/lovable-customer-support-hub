import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock } from "lucide-react";

// Common timezones organized by region
const TIMEZONE_REGIONS = {
  'Americas': [
    { value: 'America/New_York', label: 'New York (EST/EDT)', offset: 'UTC-5/-4' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)', offset: 'UTC-6/-5' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)', offset: 'UTC-7/-6' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', offset: 'UTC-8/-7' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)', offset: 'UTC-5/-4' },
    { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)', offset: 'UTC-8/-7' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', offset: 'UTC-3' },
    { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)', offset: 'UTC-6/-5' },
  ],
  'Europe': [
    { value: 'Europe/London', label: 'London (GMT/BST)', offset: 'UTC+0/+1' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Oslo', label: 'Oslo (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', offset: 'UTC+1/+2' },
    { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', offset: 'UTC+1/+2' },
  ],
  'Asia': [
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: 'UTC+8' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: 'UTC+8' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 'UTC+8' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: 'UTC+9' },
    { value: 'Asia/Mumbai', label: 'Mumbai (IST)', offset: 'UTC+5:30' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: 'UTC+4' },
  ],
  'Pacific': [
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: 'UTC+10/+11' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: 'UTC+10/+11' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: 'UTC+12/+13' },
  ],
  'Other': [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'UTC+0' },
  ]
};

// Flatten all timezones for easy searching
const ALL_TIMEZONES = Object.values(TIMEZONE_REGIONS).flat();

export function TimezoneSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentTimezone, setCurrentTimezone] = useState<string>('');
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');

  // Auto-detect browser timezone on component mount
  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(browserTimezone);
    
    // Load user's saved timezone preference
    const loadUserTimezone = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .single();

        if (profile?.timezone) {
          setCurrentTimezone(profile.timezone);
        } else {
          // If no timezone is set, auto-save the detected one
          setCurrentTimezone(browserTimezone);
          await supabase
            .from('profiles')
            .update({ timezone: browserTimezone })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Failed to load user timezone:', error);
        setCurrentTimezone(browserTimezone);
      }
    };

    loadUserTimezone();
  }, [user]);

  const handleTimezoneChange = async (timezone: string) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentTimezone(timezone);
      
      const selectedTz = ALL_TIMEZONES.find(tz => tz.value === timezone);
      toast({
        title: t('settings.timezone.success'),
        description: `Timezone changed to ${selectedTz?.label || timezone}`,
      });
    } catch (error) {
      console.error('Error updating timezone:', error);
      toast({
        title: "Error",
        description: "Failed to update timezone preference",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentTime = (timezone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(new Date());
    } catch {
      return 'Invalid timezone';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('settings.timezone.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.timezone.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time Display */}
        {currentTimezone && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {t('settings.timezone.currentTime')}
            </div>
            <div className="text-lg font-semibold">
              {getCurrentTime(currentTimezone)}
            </div>
            <div className="text-xs text-muted-foreground">
              {ALL_TIMEZONES.find(tz => tz.value === currentTimezone)?.label || currentTimezone}
            </div>
          </div>
        )}

        {/* Timezone Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.timezone.label')}</label>
          <Select
            value={currentTimezone}
            onValueChange={handleTimezoneChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.timezone.placeholder')} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {Object.entries(TIMEZONE_REGIONS).map(([region, timezones]) => (
                <div key={region}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {region}
                  </div>
                  {timezones.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      <div className="flex flex-col">
                        <span>{timezone.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {timezone.offset} • {getCurrentTime(timezone.value)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-detected timezone info */}
        {detectedTimezone && detectedTimezone !== currentTimezone && (
          <div className="p-3 rounded-lg border border-border bg-card">
            <div className="text-sm font-medium mb-1">
              {t('settings.timezone.detected')}
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {ALL_TIMEZONES.find(tz => tz.value === detectedTimezone)?.label || detectedTimezone}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTimezoneChange(detectedTimezone)}
              disabled={isUpdating}
            >
              {t('settings.timezone.useDetected')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
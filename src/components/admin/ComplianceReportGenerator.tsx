import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { FileText, Download, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ComplianceReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReportTemplate = 'access_control' | 'user_lifecycle' | 'org_changes' | 'security_events';

const reportTemplates: Record<ReportTemplate, { label: string; description: string }> = {
  access_control: {
    label: 'Access Control Changes',
    description: 'Role assignments, removals, and permission changes',
  },
  user_lifecycle: {
    label: 'User Lifecycle Report',
    description: 'User creation, updates, and deletion events',
  },
  org_changes: {
    label: 'Organization Changes',
    description: 'Organization creation, updates, and membership changes',
  },
  security_events: {
    label: 'Security Events',
    description: 'All security-relevant administrative actions',
  },
};

export function ComplianceReportGenerator({ open, onOpenChange }: ComplianceReportGeneratorProps) {
  const [template, setTemplate] = useState<ReportTemplate>('access_control');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCSV = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a date range');
      return;
    }

    setIsGenerating(true);
    try {
      // Build query based on template
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      // Apply template-specific filters
      switch (template) {
        case 'access_control':
          query = query.in('action_type', [
            'user.role.assign',
            'user.role.remove',
            'org.member.role.update',
          ]);
          break;
        case 'user_lifecycle':
          query = query.in('action_type', [
            'user.create',
            'user.update',
            'user.delete',
          ]);
          break;
        case 'org_changes':
          query = query.in('action_type', [
            'org.create',
            'org.update',
            'org.delete',
            'org.member.add',
            'org.member.remove',
          ]);
          break;
        case 'security_events':
          // Include all events
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No data found for the selected criteria');
        return;
      }

      // Generate CSV
      const csv = [
        ['Timestamp', 'Actor Email', 'Actor Role', 'Action Type', 'Category', 'Target Type', 'Target', 'Changes', 'Organization ID'].join(','),
        ...data.map(log => [
          log.created_at,
          log.actor_email,
          log.actor_role,
          log.action_type,
          log.action_category,
          log.target_type,
          log.target_identifier,
          JSON.stringify(log.changes).replace(/,/g, ';'),
          log.organization_id || 'N/A',
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${template}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();

      toast.success('Report generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Compliance Report
          </DialogTitle>
          <DialogDescription>
            Create audit reports for compliance and regulatory purposes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Template Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Report Template</label>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(reportTemplates).map(([key, { label, description }]) => (
                <Card
                  key={key}
                  className={`p-4 cursor-pointer transition-all ${
                    template === key
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setTemplate(key as ReportTemplate)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{label}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                    {template === key && (
                      <div className="w-4 h-4 rounded-full bg-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    'Pick a date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Export Format */}
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <Select defaultValue="csv">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateCSV} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

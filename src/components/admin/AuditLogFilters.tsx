import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

interface AuditLogFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: DateRangePreset;
  onDateRangeChange: (range: DateRangePreset) => void;
  customDateRange?: DateRange;
  onCustomDateRangeChange: (range: DateRange | undefined) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  selectedActionTypes: string[];
  onActionTypesChange: (types: string[]) => void;
  selectedActorRoles: string[];
  onActorRolesChange: (roles: string[]) => void;
}

const availableActionTypes = [
  'user.role.assign',
  'user.role.remove',
  'user.update',
  'user.delete',
  'user.create',
  'org.create',
  'org.update',
  'org.delete',
  'org.member.add',
  'org.member.remove',
  'org.member.role.update',
];

const availableActorRoles = ['super_admin', 'admin', 'agent', 'user'];

export function AuditLogFilters({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  categoryFilter,
  onCategoryFilterChange,
  selectedActionTypes,
  onActionTypesChange,
  selectedActorRoles,
  onActorRolesChange,
}: AuditLogFiltersProps) {
  const toggleActionType = (type: string) => {
    if (selectedActionTypes.includes(type)) {
      onActionTypesChange(selectedActionTypes.filter(t => t !== type));
    } else {
      onActionTypesChange([...selectedActionTypes, type]);
    }
  };

  const toggleActorRole = (role: string) => {
    if (selectedActorRoles.includes(role)) {
      onActorRolesChange(selectedActorRoles.filter(r => r !== role));
    } else {
      onActorRolesChange([...selectedActorRoles, role]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onDateRangeChange('30d');
    onCustomDateRangeChange(undefined);
    onCategoryFilterChange('all');
    onActionTypesChange([]);
    onActorRolesChange([]);
  };

  const activeFiltersCount = 
    (searchQuery ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    selectedActionTypes.length +
    selectedActorRoles.length;

  return (
    <Card className="p-4 space-y-4">
      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by actor, target, or action..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangePreset)}>
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, 'LLL dd, y')} - {format(customDateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(customDateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    'Pick a date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={customDateRange}
                  onSelect={onCustomDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="user_management">User Management</SelectItem>
            <SelectItem value="org_management">Organization</SelectItem>
            <SelectItem value="role_management">Role Management</SelectItem>
            <SelectItem value="bulk_management">Bulk Operations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <div className="space-y-3">
        {/* Action Types */}
        <div>
          <label className="text-sm font-medium mb-2 block">Action Types</label>
          <div className="flex flex-wrap gap-2">
            {availableActionTypes.map((type) => (
              <Badge
                key={type}
                variant={selectedActionTypes.includes(type) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleActionType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actor Roles */}
        <div>
          <label className="text-sm font-medium mb-2 block">Actor Roles</label>
          <div className="flex flex-wrap gap-2">
            {availableActorRoles.map((role) => (
              <Badge
                key={role}
                variant={selectedActorRoles.includes(role) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleActorRole(role)}
              >
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
          </span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        </div>
      )}
    </Card>
  );
}

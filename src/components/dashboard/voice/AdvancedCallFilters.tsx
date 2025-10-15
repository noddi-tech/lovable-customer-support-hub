import React, { useState, useMemo } from 'react';
import { Search, X, Filter, Clock, Phone, AlertCircle, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CallFilters {
  search: string;
  status: string[];
  timeRange: string;
  duration: string;
  priority: string[];
}

interface AdvancedCallFiltersProps {
  filters: CallFilters;
  onFiltersChange: (filters: CallFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

export const AdvancedCallFilters: React.FC<AdvancedCallFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}) => {
  const [searchValue, setSearchValue] = useState(filters.search);

  const statusOptions = [
    { value: 'missed', label: 'Missed', icon: AlertCircle, color: 'destructive' },
    { value: 'completed', label: 'Completed', icon: Phone, color: 'success' },
    { value: 'ongoing', label: 'Ongoing', icon: Phone, color: 'default' },
    { value: 'callback', label: 'Callback Needed', icon: Phone, color: 'warning' },
  ];

  const timeRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last30days', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
  ];

  const durationOptions = [
    { value: 'under1', label: '< 1 min' },
    { value: '1to5', label: '1-5 min' },
    { value: '5to15', label: '5-15 min' },
    { value: 'over15', label: '> 15 min' },
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Urgent', icon: AlertCircle },
    { value: 'unpaid', label: 'Unpaid Bookings', icon: AlertCircle },
    { value: 'vip', label: 'VIP Customers', icon: Star },
  ];

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority];
    onFiltersChange({ ...filters, priority: newPriorities });
  };

  const setTimeRange = (timeRange: string) => {
    onFiltersChange({ ...filters, timeRange });
  };

  const setDuration = (duration: string) => {
    onFiltersChange({ ...filters, duration });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    count += filters.status.length;
    if (filters.timeRange && filters.timeRange !== 'all') count++;
    if (filters.duration) count++;
    count += filters.priority.length;
    return count;
  }, [filters]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or call ID..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
          autoFocus={false}
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8',
                filters.status.length > 0 && 'border-primary bg-primary/5'
              )}
            >
              <Phone className="h-3 w-3 mr-1.5" />
              Status
              {filters.status.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                  {filters.status.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.status.includes(option.value) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => toggleStatus(option.value)}
                >
                  <option.icon className="h-3 w-3 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Time Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8',
                filters.timeRange && filters.timeRange !== 'all' && 'border-primary bg-primary/5'
              )}
            >
              <Clock className="h-3 w-3 mr-1.5" />
              {timeRangeOptions.find((o) => o.value === filters.timeRange)?.label || 'Time'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {timeRangeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.timeRange === option.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => setTimeRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Duration Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8',
                filters.duration && 'border-primary bg-primary/5'
              )}
            >
              <Clock className="h-3 w-3 mr-1.5" />
              {durationOptions.find((o) => o.value === filters.duration)?.label || 'Duration'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2" align="start">
            <div className="space-y-1">
              {durationOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.duration === option.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => setDuration(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8',
                filters.priority.length > 0 && 'border-primary bg-primary/5'
              )}
            >
              <Filter className="h-3 w-3 mr-1.5" />
              Priority
              {filters.priority.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                  {filters.priority.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {priorityOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.priority.includes(option.value) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => togglePriority(option.value)}
                >
                  <option.icon className="h-3 w-3 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={onClearFilters}
          >
            <X className="h-3 w-3 mr-1.5" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.status.map((status) => {
            const option = statusOptions.find((o) => o.value === status);
            return (
              <Badge
                key={status}
                variant="secondary"
                className="h-6 pl-2 pr-1 text-xs"
              >
                {option?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => toggleStatus(status)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            );
          })}
          {filters.priority.map((priority) => {
            const option = priorityOptions.find((o) => o.value === priority);
            return (
              <Badge
                key={priority}
                variant="secondary"
                className="h-6 pl-2 pr-1 text-xs"
              >
                {option?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => togglePriority(priority)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, Check, X, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallMetricsCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: 'phone' | 'clock' | 'check' | 'x';
  variant?: 'default' | 'warning' | 'success';
}

const iconMap = {
  phone: Phone,
  clock: Clock,
  check: Check,
  x: X,
};

export const CallMetricsCard = ({
  title,
  value,
  trend,
  icon = 'phone',
  variant = 'default',
}: CallMetricsCardProps) => {
  const Icon = iconMap[icon];
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn(
          "h-4 w-4",
          variant === 'warning' && "text-destructive",
          variant === 'success' && "text-success"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center text-xs mt-1",
            isPositive && "text-success",
            isNegative && "text-destructive"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : isNegative ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : null}
            <span>{Math.abs(trend)}% from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

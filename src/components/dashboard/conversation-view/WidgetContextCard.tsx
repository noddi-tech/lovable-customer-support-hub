import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WidgetContextCardProps {
  metadata: unknown;
  className?: string;
}

const LABELS: Record<string, string> = {
  locale: 'Language',
  environment: 'Environment',
  source_app: 'Source app',
  user_id: 'User ID',
  service_department_id: 'Department',
  booking_id: 'Booking',
  order_id: 'Order',
  pathname: 'Route',
  app_version: 'App version',
};

const ORDER = Object.keys(LABELS);

/**
 * Shows the optional context the embedding site sent at widget init
 * (locale, environment, source app, booking/order, SPA route, release).
 */
export const WidgetContextCard: React.FC<WidgetContextCardProps> = ({ metadata, className }) => {
  const entries = useMemo(() => {
    const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, any>;
    const ctx = meta.context;
    if (!ctx || typeof ctx !== 'object') return [];
    return ORDER
      .filter((key) => ctx[key] !== undefined && ctx[key] !== null && ctx[key] !== '')
      .map((key) => ({ key, label: LABELS[key], value: String(ctx[key]) }));
  }, [metadata]);

  if (entries.length === 0) return null;

  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, any>;
  const isNonProd =
    typeof meta.context?.environment === 'string' &&
    !/^prod/i.test(meta.context.environment);

  return (
    <div className={cn('rounded-md border bg-muted/30 p-3 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Session context</span>
        {isNonProd && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {meta.context.environment}
          </Badge>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {entries.map(({ key, label, value }) => (
          <React.Fragment key={key}>
            <dt className="text-muted-foreground whitespace-nowrap">{label}</dt>
            <dd className="text-foreground break-all">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
};

import React from 'react';
import { User, Loader2 } from 'lucide-react';
import { Call } from '@/hooks/useCalls';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { NoddiStatusBadges } from './NoddiStatusBadges';
import { displayName } from '@/utils/noddiHelpers';

interface CallCustomerInfoProps {
  call: Call;
}

const CallCustomerInfoComponent: React.FC<CallCustomerInfoProps> = ({ call }) => {
  const customer = call.customers;
  const { data: noddiData, isLoading } = useNoddihKundeData({
    id: customer?.id || '',
    email: customer?.email,
    phone: call.customer_phone,
    full_name: customer?.full_name,
  });

  // Show customer name from database
  const customerName = customer?.full_name || displayName(noddiData?.data?.user, customer?.email);

  return (
    <div className="flex items-center gap-2 mb-1">
      {/* Customer Name */}
      {customerName && customerName !== 'Unknown Name' && (
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <User className="h-3 w-3 text-muted-foreground" />
          <span>{customerName}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex gap-1">
          <div className="h-4 w-16 bg-muted/50 animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted/50 animate-pulse rounded" />
        </div>
      )}

      {/* Noddi Status Badges */}
      {noddiData && !isLoading && (
        <NoddiStatusBadges noddiData={noddiData} />
      )}
    </div>
  );
};

export const CallCustomerInfo = React.memo(CallCustomerInfoComponent, (prevProps, nextProps) => {
  return prevProps.call.id === nextProps.call.id && 
         prevProps.call.customer_phone === nextProps.call.customer_phone &&
         prevProps.call.customers?.email === nextProps.call.customers?.email;
});

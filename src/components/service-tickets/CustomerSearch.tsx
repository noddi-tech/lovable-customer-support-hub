import { NoddiCustomerSearch } from '@/components/shared/NoddiCustomerSearch';

interface Customer {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  metadata?: {
    noddi_user_id?: string;
    user_group_id?: string;
    is_new?: boolean;
    noddi_email?: string;
  };
}

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  organizationId: string;
}

export const CustomerSearch = ({ 
  selectedCustomer, 
  onSelectCustomer,
  organizationId 
}: CustomerSearchProps) => {
  return (
    <NoddiCustomerSearch
      organizationId={organizationId}
      selectedCustomer={selectedCustomer}
      onSelectCustomer={onSelectCustomer}
    />
  );
};

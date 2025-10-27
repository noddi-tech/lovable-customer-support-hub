import { useState, useEffect } from 'react';
import { Search, X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const searchCustomers = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Split search term into first and last name
        const nameParts = debouncedSearchTerm.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");

        const { data, error } = await supabase.functions.invoke('noddi-search-by-name', {
          body: {
            firstName,
            lastName: lastName || undefined,
            organizationId,
          },
        });

        if (error) throw error;

        // Transform Noddi results to Customer format
        const transformedResults = (data?.results || []).map((result: any) => ({
          id: result.local_customer_id || `noddi-${result.noddi_user_id}`,
          full_name: result.full_name,
          email: result.email, // Use local email if available
          phone: result.phone,
          metadata: {
            noddi_user_id: result.noddi_user_id,
            user_group_id: result.user_group_id,
            is_new: result.is_new,
            noddi_email: result.noddi_email,
          }
        }));

        setSearchResults(transformedResults);
      } catch (error) {
        console.error('Failed to search customers:', error);
        toast.error('Failed to search customers');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchCustomers();
  }, [debouncedSearchTerm, organizationId]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleClearCustomer = () => {
    onSelectCustomer(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  if (selectedCustomer) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Selected Customer</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedCustomer.full_name}</p>
                  {selectedCustomer.email && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  )}
                  {selectedCustomer.phone && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  )}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCustomer}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="customer-search">Search Customer (Optional)</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="customer-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name..."
          className="pl-9"
        />
      </div>

      {searchResults.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{customer.full_name}</p>
                      {customer.email && (
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      )}
                      {customer.phone && (
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      )}
                    </div>
                    {customer.metadata?.is_new && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        New
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isSearching && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {debouncedSearchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
        <p className="text-sm text-muted-foreground">No customers found</p>
      )}
    </div>
  );
};

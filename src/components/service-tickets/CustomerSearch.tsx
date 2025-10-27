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
        const { data, error } = await supabase.functions.invoke('search-customers-by-name', {
          body: {
            searchTerm: debouncedSearchTerm,
            organizationId,
          },
        });

        if (error) throw error;
        setSearchResults(data || []);
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
                  <p className="font-medium">{customer.full_name}</p>
                  {customer.email && (
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  )}
                  {customer.phone && (
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  )}
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

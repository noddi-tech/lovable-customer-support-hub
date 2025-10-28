import { useState, useEffect } from 'react';
import { X, User, Loader2, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    badge?: string;
    has_priority?: boolean;
    unpaid_count?: number;
  };
}

interface NoddiCustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  organizationId: string;
  showEmailSearch?: boolean;
  conversationEmail?: string;
}

export const NoddiCustomerSearch = ({ 
  selectedCustomer, 
  onSelectCustomer,
  organizationId,
  showEmailSearch = false,
  conversationEmail
}: NoddiCustomerSearchProps) => {
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'name' | 'email'>('name');
  const [alternativeEmail, setAlternativeEmail] = useState('');

  const handleNameSearch = async () => {
    const firstName = searchFirstName.trim();
    const lastName = searchLastName.trim();
    
    if (firstName.length < 2) {
      toast.error('Please enter at least 2 characters for first name');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const body: any = {
        firstName,
        organizationId,
      };
      
      if (lastName) {
        body.lastName = lastName;
      }

      const { data, error } = await supabase.functions.invoke(
        'noddi-search-by-name',
        { body }
      );

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const transformedCustomers = data.results.map((result: any) => ({
          id: result.local_customer_id || `noddi-${result.noddi_user_id}`,
          full_name: result.full_name,
          email: result.email || null,
          phone: result.phone,
          metadata: {
            noddi_user_id: result.noddi_user_id,
            user_group_id: result.user_group_id,
            is_new: result.is_new,
            noddi_email: result.noddi_email,
            badge: result.badge,
            has_priority: result.has_priority,
            unpaid_count: result.unpaid_count
          }
        }));

        setSearchResults(transformedCustomers);
        toast.success(`Found ${transformedCustomers.length} customer${transformedCustomers.length > 1 ? 's' : ''} in Noddi`);
      } else {
        const searchTerm = lastName ? `"${firstName} ${lastName}"` : `"${firstName}"`;
        toast.error(`No customers found matching ${searchTerm}`);
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
      toast.error('Failed to search customers');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAlternativeEmailSearch = async () => {
    if (!alternativeEmail || !organizationId) return;
    
    setIsSearching(true);
    setSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke(
        'noddi-lookup-by-email',
        { body: { email: alternativeEmail, organizationId } }
      );

      if (error) throw error;

      if (data?.customer) {
        const customer = {
          id: data.customer.local_customer_id || `noddi-${data.customer.noddi_user_id}`,
          full_name: data.customer.full_name,
          email: conversationEmail || null,
          phone: data.customer.phone,
          metadata: {
            noddi_user_id: data.customer.noddi_user_id,
            user_group_id: data.customer.user_group_id,
            is_new: data.customer.is_new,
            noddi_email: data.customer.noddi_email
          }
        };
        
        setSearchResults([customer]);
        toast.success('Customer found');
      } else {
        toast.error('No customer found with that email');
      }
    } catch (error) {
      console.error('Failed to search by email:', error);
      toast.error('Failed to search by email');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchFirstName('');
    setSearchLastName('');
    setAlternativeEmail('');
    setSearchResults([]);
  };

  const handleClearCustomer = () => {
    onSelectCustomer(null);
    setSearchFirstName('');
    setSearchLastName('');
    setAlternativeEmail('');
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
                  {selectedCustomer.metadata?.noddi_email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.metadata.noddi_email}
                    </p>
                  )}
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
    <div className="space-y-3">
      <Label>Search Customer (Optional)</Label>
      
      {showEmailSearch && (
        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setSearchMode('name')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              searchMode === 'name' 
                ? 'border-b-2 border-primary font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Search by Name
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('email')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              searchMode === 'email' 
                ? 'border-b-2 border-primary font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Search by Email
          </button>
        </div>
      )}

      {searchMode === 'name' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first-name"
              value={searchFirstName}
              onChange={(e) => setSearchFirstName(e.target.value)}
              placeholder="e.g., Joachim"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchFirstName.length >= 2) handleNameSearch();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last-name">
              Last Name <span className="text-sm text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="last-name"
              value={searchLastName}
              onChange={(e) => setSearchLastName(e.target.value)}
              placeholder="e.g., Rathke"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchFirstName.length >= 2) handleNameSearch();
              }}
            />
          </div>

          <Button
            type="button"
            onClick={handleNameSearch}
            disabled={!searchFirstName || searchFirstName.length < 2 || isSearching}
            className="w-full"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </div>
      )}

      {searchMode === 'email' && showEmailSearch && (
        <div className="space-y-2">
          <Label htmlFor="alternative-email">Alternative Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="alternative-email"
              type="email"
              placeholder="alternative@email.com"
              value={alternativeEmail}
              onChange={(e) => setAlternativeEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAlternativeEmailSearch();
              }}
            />
            <Button
              type="button"
              onClick={handleAlternativeEmailSearch}
              disabled={!alternativeEmail || isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>
      )}

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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{customer.full_name}</p>
                        {customer.metadata?.badge && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            Badge {customer.metadata.badge}
                          </Badge>
                        )}
                        {customer.metadata?.has_priority && (
                          <span className="text-yellow-600" title="Has priority booking">
                            ⭐
                          </span>
                        )}
                        {customer.metadata?.unpaid_count && customer.metadata.unpaid_count > 0 && (
                          <span className="text-destructive text-[10px] font-semibold" title={`${customer.metadata.unpaid_count} unpaid booking(s)`}>
                            ⚠️ {customer.metadata.unpaid_count} unpaid
                          </span>
                        )}
                        {customer.metadata?.is_new && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {customer.metadata?.noddi_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.metadata.noddi_email}
                            <span className="text-[10px] font-medium">(Noddi)</span>
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
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
    </div>
  );
};

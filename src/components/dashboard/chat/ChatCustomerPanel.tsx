import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getCustomerCacheKey } from '@/utils/customerCacheKey';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

interface Customer {
  id?: string;
  email?: string;
  phone?: string;
  full_name?: string;
  metadata?: Record<string, any>;
}

interface ChatCustomerPanelProps {
  customer: Customer | null;
  conversationId: string;
  onClose: () => void;
}

export const ChatCustomerPanel: React.FC<ChatCustomerPanelProps> = ({
  customer,
  conversationId,
  onClose
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  // Noddi data state
  const [noddiData, setNoddiData] = useState<NoddiLookupResponse | null>(null);
  const [selectedUserGroupId, setSelectedUserGroupId] = useState<number | undefined>(undefined);

  // Alternative search state
  const [searchMode, setSearchMode] = useState<'email' | 'name'>('email');
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [alternativeEmailResult, setAlternativeEmailResult] = useState(false);
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [matchingCustomers, setMatchingCustomers] = useState<any[]>([]);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);

  const handleUserGroupChange = (userGroupId: number) => {
    setSelectedUserGroupId(userGroupId);
  };

  const handleAlternativeEmailSearch = async () => {
    if (!alternativeEmail || !customer?.id) return;

    if (!organizationId) {
      toast({
        title: 'Session error',
        description: 'Unable to determine your organization. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setSearchLoading(true);
    setAlternativeEmailResult(false);

    try {
      const { data: lookupData, error: lookupError } =
        await supabase.functions.invoke("noddi-customer-lookup", {
          body: {
            email: alternativeEmail,
            customerId: customer.id,
            organizationId,
          },
        });

      if (lookupError) throw lookupError;

      if (lookupData?.data?.found) {
        const { error: updateError } = await supabase.functions.invoke(
          "update-customer-alternative-email",
          {
            body: {
              customerId: customer.id,
              alternativeEmail,
              primaryEmail: customer.email,
            },
          }
        );

        if (updateError) throw updateError;

        setNoddiData(lookupData);
        setAlternativeEmailResult(true);

        toast({
          title: "Booking data found",
          description: `Found booking data for ${alternativeEmail}!`,
        });

        // Invalidate cache
        if (organizationId) {
          const oldCacheKey = getCustomerCacheKey({
            email: customer.email,
            phone: customer.phone
          });
          await queryClient.invalidateQueries({ 
            queryKey: ['noddi-customer-lookup', oldCacheKey, organizationId],
            exact: true 
          });
          
          const newCacheKey = getCustomerCacheKey({
            email: alternativeEmail,
            phone: customer.phone
          });
          await queryClient.invalidateQueries({ 
            queryKey: ['noddi-customer-lookup', newCacheKey, organizationId],
            exact: true 
          });
        }
        
        await queryClient.invalidateQueries({
          queryKey: ['conversation-meta'],
          predicate: (query) => 
            query.queryKey[0] === 'conversation-meta' && 
            query.queryKey[1] === conversationId
        });
      } else {
        toast({
          title: "No booking data",
          description: `No booking data found for ${alternativeEmail}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Alternative Email Search] Error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search with alternative email",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNameSearch = async () => {
    const firstName = searchFirstName.trim();
    const lastName = searchLastName.trim();
    
    if (firstName.length < 2) {
      toast({
        title: "Invalid search",
        description: "Please enter at least 2 characters for first name",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId) {
      toast({
        title: 'Session error',
        description: 'Unable to determine your organization. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setNameSearchLoading(true);
    setMatchingCustomers([]);

    try {
      const body: any = {
        firstName,
        organizationId,
      };
      
      if (lastName) {
        body.lastName = lastName;
      }

      const { data, error } = await supabase.functions.invoke(
        "noddi-search-by-name",
        { body }
      );

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const transformedCustomers = data.results.map((result: any) => ({
          id: result.local_customer_id || `noddi-${result.noddi_user_id}`,
          full_name: result.full_name,
          email: null,
          phone: result.phone,
          metadata: {
            noddi_user_id: result.noddi_user_id,
            user_group_id: result.user_group_id,
            is_new: result.is_new,
            noddi_email: result.noddi_email
          }
        }));

        setMatchingCustomers(transformedCustomers);
        toast({
          title: "Found customers",
          description: `Found ${transformedCustomers.length} customer${transformedCustomers.length > 1 ? "s" : ""} in Noddi`,
        });
      } else {
        const searchTerm = lastName ? `"${firstName} ${lastName}"` : `"${firstName}"`;
        toast({
          title: "No matches",
          description: `No customers found in Noddi matching ${searchTerm}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Name Search] Error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search Noddi customers by name",
        variant: "destructive",
      });
    } finally {
      setNameSearchLoading(false);
    }
  };

  const handleSelectCustomer = async (selectedCustomer: any) => {
    if (!selectedCustomer.email && !selectedCustomer.phone && !selectedCustomer.metadata?.noddi_email) {
      toast({
        title: "Cannot link",
        description: "Selected customer has no email, phone, or Noddi account",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId) {
      toast({
        title: 'Session error',
        description: 'Unable to determine your organization. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setSearchLoading(true);

    try {
      let customerId = customer?.id;

      // If no customer, create one
      if (!customerId) {
        if (selectedCustomer.metadata?.is_new) {
          const metadata: any = {};
          if (selectedCustomer.metadata?.noddi_email) {
            metadata.alternative_emails = [selectedCustomer.metadata.noddi_email];
          }

          const { data: newCustomer, error: createError } = await supabase
            .from("customers")
            .insert({
              full_name: selectedCustomer.full_name,
              email: customer?.email || selectedCustomer.phone,
              phone: selectedCustomer.phone,
              organization_id: organizationId,
              metadata,
            })
            .select()
            .single();

          if (createError) throw createError;
          customerId = newCustomer.id;

          toast({
            title: "Customer created",
            description: `Created new customer: ${selectedCustomer.full_name}`,
          });
        } else {
          customerId = selectedCustomer.metadata?.local_customer_id || selectedCustomer.id;
        }
      }

      // Add Noddi email to alternative_emails
      if (customerId && selectedCustomer.metadata?.noddi_email) {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select('metadata')
          .eq('id', customerId)
          .single();
        
        const existingMeta = existingCustomer?.metadata as Record<string, any> | null;
        const currentAltEmails = (existingMeta?.alternative_emails as string[]) || [];
        const noddiEmail = selectedCustomer.metadata.noddi_email;
        
        if (!currentAltEmails.includes(noddiEmail)) {
          await supabase
            .from("customers")
            .update({
              metadata: {
                ...(existingMeta || {}),
                alternative_emails: [...currentAltEmails, noddiEmail]
              }
            })
            .eq('id', customerId);
        }
      }

      // Link customer to conversation
      if (customerId !== customer?.id) {
        await supabase
          .from("conversations")
          .update({ customer_id: customerId })
          .eq("id", conversationId);
      }

      // Prepare alternative emails
      const alternativeEmailsToTry: string[] = [];
      if (selectedCustomer.metadata?.noddi_email) {
        alternativeEmailsToTry.push(selectedCustomer.metadata.noddi_email);
      }

      // Lookup Noddi data
      const { data: lookupData, error: lookupError } =
        await supabase.functions.invoke("noddi-customer-lookup", {
          body: {
            email: customer?.email,
            phone: selectedCustomer.phone,
            customerId: customerId,
            organizationId,
            alternative_emails: alternativeEmailsToTry,
          },
        });

      if (lookupError) throw lookupError;

      if (lookupData?.data?.found) {
        if (selectedCustomer.metadata?.noddi_email) {
          await supabase.functions.invoke("update-customer-alternative-email", {
            body: {
              customerId: customerId,
              alternativeEmail: selectedCustomer.metadata.noddi_email,
              primaryEmail: customer?.email,
            },
          });
        }

        setNoddiData(lookupData);
        setAlternativeEmailResult(true);
        setMatchingCustomers([]);

        toast({
          title: "Customer linked",
          description: `Found booking data for ${selectedCustomer.full_name}!`,
        });

        // Invalidate caches
        if (organizationId) {
          const oldCacheKey = getCustomerCacheKey({
            email: customer?.email,
            phone: selectedCustomer.phone
          });
          await queryClient.invalidateQueries({ 
            queryKey: ['noddi-customer-lookup', oldCacheKey, organizationId],
            exact: true 
          });
          
          if (selectedCustomer.metadata?.noddi_email) {
            const newCacheKey = getCustomerCacheKey({
              email: selectedCustomer.metadata.noddi_email,
              phone: selectedCustomer.phone
            });
            await queryClient.invalidateQueries({ 
              queryKey: ['noddi-customer-lookup', newCacheKey, organizationId],
              exact: true 
            });
          }
        }
        
        await queryClient.invalidateQueries({
          queryKey: ['conversation-meta'],
          predicate: (query) => 
            query.queryKey[0] === 'conversation-meta' && 
            query.queryKey[1] === conversationId
        });
      } else {
        toast({
          title: "No booking data",
          description: `Linked customer but no booking data found.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Select Customer] Error:", error);
      toast({
        title: "Failed to link",
        description: "Error linking customer to conversation",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="w-80 border-l flex-shrink-0 overflow-auto bg-background">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium text-sm">Customer Details</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-3 space-y-4">
        {/* Same component as email view */}
        <NoddiCustomerDetails
          customerId={customer?.id}
          customerEmail={customer?.email}
          customerPhone={customer?.phone}
          customerName={customer?.full_name}
          noddiEmail={(customer?.metadata as any)?.primary_noddi_email || (customer?.metadata as any)?.alternative_emails?.[0]}
          onDataLoaded={setNoddiData}
          noddiData={noddiData}
          onUserGroupChange={handleUserGroupChange}
          selectedUserGroupId={selectedUserGroupId}
        />

        {/* Alternative Lookup - only show if no data found */}
        {customer?.id && noddiData && !noddiData?.data?.found && (
          <Card className="border-amber-200 bg-amber-50/50 relative z-20" style={{ pointerEvents: 'auto' }}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    No booking data found
                  </p>
                  <p className="text-xs text-amber-700">
                    Search by alternative email or customer name
                  </p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-3 border-b border-amber-200">
                <button
                  onClick={() => setSearchMode('email')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors border-b-2",
                    searchMode === 'email'
                      ? "border-amber-600 text-amber-900"
                      : "border-transparent text-amber-700 hover:text-amber-900"
                  )}
                >
                  Search by Email
                </button>
                <button
                  onClick={() => setSearchMode('name')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors border-b-2",
                    searchMode === 'name'
                      ? "border-amber-600 text-amber-900"
                      : "border-transparent text-amber-700 hover:text-amber-900"
                  )}
                >
                  Search by Name
                </button>
              </div>

              {/* Email Search Tab */}
              {searchMode === 'email' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-amber-900">
                    Alternative email address:
                  </label>
                  <div className="flex gap-2 relative z-10" style={{ pointerEvents: 'auto' }}>
                    <Input
                      type="email"
                      placeholder="alternative@email.com"
                      value={alternativeEmail}
                      onChange={(e) => setAlternativeEmail(e.target.value)}
                      className="text-sm h-8 relative z-10"
                      style={{ pointerEvents: 'auto' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAlternativeEmailSearch();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAlternativeEmailSearch}
                      disabled={!alternativeEmail || searchLoading}
                      className="h-8"
                    >
                      {searchLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Search"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Name Search Tab */}
              {searchMode === 'name' && (
                <div className="space-y-3">
                  {/* First Name Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-amber-900">
                      First name: <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Joachim"
                      value={searchFirstName}
                      onChange={(e) => setSearchFirstName(e.target.value)}
                      className="text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchFirstName.length >= 2) handleNameSearch();
                      }}
                    />
                  </div>

                  {/* Last Name Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-amber-900">
                      Last name: <span className="text-xs text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Rathke"
                      value={searchLastName}
                      onChange={(e) => setSearchLastName(e.target.value)}
                      className="text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchFirstName.length >= 2) handleNameSearch();
                      }}
                    />
                  </div>

                  {/* Search Button */}
                  <Button
                    size="sm"
                    onClick={handleNameSearch}
                    disabled={!searchFirstName || searchFirstName.length < 2 || nameSearchLoading}
                    className="h-8 w-full"
                  >
                    {nameSearchLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>

                  {/* Matching Customers List */}
                  {matchingCustomers.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                      <p className="text-xs font-medium text-amber-900 mb-2">
                        Select customer to link:
                      </p>
                      {matchingCustomers.map((matchedCustomer) => (
                        <button
                          key={matchedCustomer.id}
                          onClick={() => handleSelectCustomer(matchedCustomer)}
                          disabled={searchLoading}
                          className="w-full text-left p-2 rounded border border-amber-200 
                                   hover:bg-amber-100 hover:border-amber-300 
                                   transition-colors text-xs space-y-1
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-amber-900">
                              {matchedCustomer.full_name}
                            </span>
                            {matchedCustomer.metadata?.badge && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Badge {matchedCustomer.metadata.badge}
                              </Badge>
                            )}
                            {matchedCustomer.metadata?.has_priority && (
                              <span className="text-yellow-600" title="Has priority booking">
                                ⭐
                              </span>
                            )}
                            {matchedCustomer.metadata?.unpaid_count > 0 && (
                              <span className="text-destructive text-[10px] font-semibold" title={`${matchedCustomer.metadata.unpaid_count} unpaid booking(s)`}>
                                ⚠️ {matchedCustomer.metadata.unpaid_count} unpaid
                              </span>
                            )}
                            {matchedCustomer.metadata?.is_new && (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="text-amber-700 flex items-center gap-2 flex-wrap">
                            {matchedCustomer.metadata?.noddi_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {matchedCustomer.metadata.noddi_email}
                                <span className="text-[10px] font-medium text-amber-600">(Noddi)</span>
                              </span>
                            )}
                            {matchedCustomer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {matchedCustomer.email}
                              </span>
                            )}
                            {matchedCustomer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {matchedCustomer.phone}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {alternativeEmailResult && (
                <Alert className="mt-3 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs text-green-900">
                    Found booking data! Customer linked successfully.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

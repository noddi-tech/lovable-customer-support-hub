import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  Mail, 
  Phone, 
  Calendar,
  Tag,
  Archive,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { cn } from '@/lib/utils';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getCustomerCacheKey } from '@/utils/customerCacheKey';
import type { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';
import { useAuth } from '@/hooks/useAuth';

interface CustomerSidePanelProps {
  conversation: any;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CustomerSidePanel = ({ 
  conversation, 
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: CustomerSidePanelProps) => {
  const { t } = useTranslation();
  const { dateTime } = useDateFormatting();
  const { dispatch, updateStatus } = useConversationView();
  const [statusLoading, setStatusLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [alternativeEmailResult, setAlternativeEmailResult] = useState(false);
  const [noddiData, setNoddiData] = useState<NoddiLookupResponse | null>(null);
  const [searchMode, setSearchMode] = useState<'email' | 'name'>('email');
  const [searchName, setSearchName] = useState('');
  const [matchingCustomers, setMatchingCustomers] = useState<any[]>([]);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);

  const handleAlternativeEmailSearch = async () => {
    if (!alternativeEmail || !conversation.customer?.id) return;

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
      // 1. Test lookup with alternative email via noddi-customer-lookup
      const { data: lookupData, error: lookupError } =
        await supabase.functions.invoke("noddi-customer-lookup", {
          body: {
            email: alternativeEmail,
            customerId: conversation.customer.id,
            organizationId,
          },
        });

      if (lookupError) throw lookupError;

      // 2. If data found, save alternative email to customer metadata
      if (lookupData?.data?.found) {
        const { error: updateError } = await supabase.functions.invoke(
          "update-customer-alternative-email",
          {
            body: {
              customerId: conversation.customer.id,
              alternativeEmail,
              primaryEmail: conversation.customer.email,
            },
          }
        );

        if (updateError) throw updateError;

        // 3. Update local state to show the data
        setNoddiData(lookupData);
        setAlternativeEmailResult(true);

        toast({
          title: "Booking data found",
          description: `Found booking data for ${alternativeEmail}!`,
        });

        // 4. Refetch queries to ensure UI updates with fresh data
        const cacheKey = getCustomerCacheKey(conversation.customer);
        await queryClient.refetchQueries({ 
          queryKey: [cacheKey],
          exact: false 
        });
        await queryClient.refetchQueries({
          queryKey: ["conversation", conversation.id],
          exact: false
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
    if (!searchName.trim() || searchName.length < 2) {
      toast({
        title: "Invalid search",
        description: "Please enter at least 2 characters",
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
      const { data: customers, error } = await supabase.functions.invoke(
        "search-customers-by-name",
        {
          body: {
            searchTerm: searchName,
            organizationId,
          },
        }
      );

      if (error) throw error;

      if (customers && customers.length > 0) {
        setMatchingCustomers(customers);
        toast({
          title: "Found customers",
          description: `Found ${customers.length} matching customer${customers.length > 1 ? "s" : ""}`,
        });
      } else {
        toast({
          title: "No matches",
          description: `No customers found matching "${searchName}"`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Name Search] Error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search customers by name",
        variant: "destructive",
      });
    } finally {
      setNameSearchLoading(false);
    }
  };

  const handleSelectCustomer = async (selectedCustomer: any) => {
    if (!selectedCustomer.email && !selectedCustomer.phone) {
      toast({
        title: "Cannot search",
        description: "Selected customer has no email or phone",
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
      // 1. Lookup Noddi data using the selected customer's email/phone
      const { data: lookupData, error: lookupError } =
        await supabase.functions.invoke("noddi-customer-lookup", {
          body: {
            email: selectedCustomer.email,
            phone: selectedCustomer.phone,
            customerId: selectedCustomer.id,
            organizationId,
          },
        });

      if (lookupError) throw lookupError;

      // 2. If data found, link this customer to current conversation
      if (lookupData?.data?.found) {
        // Update conversation to link to the found customer
        const { error: updateError } = await supabase
          .from("conversations")
          .update({ customer_id: selectedCustomer.id })
          .eq("id", conversation.id);

        if (updateError) throw updateError;

        // 3. Save alternative email if different from conversation email
        if (
          conversation.customer?.email &&
          selectedCustomer.email !== conversation.customer.email
        ) {
          await supabase.functions.invoke("update-customer-alternative-email", {
            body: {
              customerId: selectedCustomer.id,
              alternativeEmail: conversation.customer.email,
              primaryEmail: selectedCustomer.email,
            },
          });
        }

        // 4. Update UI
        setNoddiData(lookupData);
        setAlternativeEmailResult(true);
        setMatchingCustomers([]); // Clear search results

        toast({
          title: "Customer linked",
          description: `Found booking data for ${selectedCustomer.full_name}!`,
        });

        // Refresh conversation data and WAIT for refetch to complete
        await queryClient.refetchQueries({ 
          queryKey: ["conversation", conversation.id],
          exact: false 
        });
        const cacheKey = getCustomerCacheKey(selectedCustomer);
        await queryClient.refetchQueries({ 
          queryKey: [cacheKey],
          exact: false 
        });
      } else {
        toast({
          title: "No booking data",
          description: `No Noddi data found for ${selectedCustomer.full_name}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Select Customer] Error:", error);
      toast({
        title: "Error",
        description: "Failed to link customer",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-full w-12 bg-card flex flex-col items-center py-4 gap-4 border-l border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
          title="Expand side panel"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full bg-card flex flex-col transition-all duration-300 ease-in-out border-l border-border",
      "animate-in slide-in-from-right"
    )}>
      {/* Header with improved styling */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <h3 className="font-semibold text-sm text-foreground">Customer Details</h3>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-7 w-7 p-0 hover:bg-primary/10 transition-colors"
              title="Collapse side panel"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-destructive/10 transition-colors"
              title="Close side panel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Section */}
      <div className="flex-1 overflow-y-auto relative" style={{ isolation: 'isolate' }}>
        <div className="p-4 space-y-4">
          
          {/* Enhanced Noddi Customer Details Component */}
          <NoddiCustomerDetails
            customerId={conversation.customer?.id}
            customerEmail={conversation.customer?.email}
            customerPhone={conversation.customer?.phone}
            customerName={conversation.customer?.full_name}
            onDataLoaded={setNoddiData}
          />

          {/* Alternative Lookup - only show if no data found */}
          {conversation.customer?.id && noddiData && !noddiData?.data?.found && (
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
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-amber-900">
                      Customer name:
                    </label>
                    <div className="flex gap-2 relative z-10" style={{ pointerEvents: 'auto' }}>
                      <Input
                        type="text"
                        placeholder="Type customer name..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="text-sm h-8 relative z-10"
                        style={{ pointerEvents: 'auto' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSearch();
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleNameSearch}
                        disabled={!searchName || searchName.length < 2 || nameSearchLoading}
                        className="h-8"
                      >
                        {nameSearchLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Search"
                        )}
                      </Button>
                    </div>

                    {/* Matching Customers List */}
                    {matchingCustomers.length > 0 && (
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium text-amber-900 mb-2">
                          Select customer to search:
                        </p>
                        {matchingCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            disabled={searchLoading}
                            className="w-full text-left p-2 rounded border border-amber-200 
                                     hover:bg-amber-100 hover:border-amber-300 
                                     transition-colors text-xs space-y-0.5
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="font-medium text-amber-900">
                              {customer.full_name}
                            </div>
                            <div className="text-amber-700 flex items-center gap-2 flex-wrap">
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
          
          <Separator />
          
          {/* Customer Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate">{conversation.customer?.email || 'N/A'}</span>
            </div>
            
            {conversation.customer?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{conversation.customer.phone}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Conversation Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Conversation</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priority:</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.priority}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Channel:</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {conversation.channel}
                </Badge>
              </div>

              {conversation.assigned_to && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="font-medium text-xs">
                    {conversation.assigned_to.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Timeline</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="text-xs">{dateTime(conversation.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="text-xs">{dateTime(conversation.updated_at)}</span>
              </div>

              {conversation.snooze_until && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-muted-foreground">Snoozed until:</span>
                  <span className="text-xs text-warning">{dateTime(conversation.snooze_until)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Management */}
      <div className="p-4 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          Status & Actions
        </h4>
        
        {/* Current Status Display */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Current Status:</span>
          <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'}>
            {conversation.status}
          </Badge>
        </div>
        
        {/* Status Change Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {conversation.status !== 'open' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setStatusLoading(true);
                await updateStatus({ status: 'open' });
                setStatusLoading(false);
              }}
              disabled={statusLoading}
              className="text-xs"
            >
              <CircleDot className="h-3 w-3 mr-1" />
              Reopen
            </Button>
          )}
          
          {conversation.status !== 'pending' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setStatusLoading(true);
                await updateStatus({ status: 'pending' });
                setStatusLoading(false);
              }}
              disabled={statusLoading}
              className="text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Button>
          )}
          
          {conversation.status !== 'closed' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={async () => {
                setStatusLoading(true);
                await updateStatus({ status: 'closed' });
                setStatusLoading(false);
              }}
              disabled={statusLoading}
              className="col-span-2 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Close Conversation
            </Button>
          )}
        </div>
        
        <Separator className="my-3" />
        
        {/* Quick Actions */}
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Quick Actions</h4>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => {
            // TODO: Implement tag dialog
            console.log('Add tag clicked');
          }}
        >
          <Tag className="h-4 w-4" />
          <span className="text-xs">Add Tag</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => {
            dispatch({ type: 'SET_SNOOZE_DIALOG', payload: { open: true, date: new Date(), time: '09:00' } });
          }}
        >
          <Clock className="h-4 w-4" />
          <span className="text-xs">Snooze</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={async () => {
            await updateStatus({ isArchived: true });
          }}
        >
          <Archive className="h-4 w-4" />
          <span className="text-xs">Archive</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => {
            // TODO: Implement delete confirmation
            console.log('Delete clicked');
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Delete</span>
        </Button>
      </div>
    </div>
  );
};

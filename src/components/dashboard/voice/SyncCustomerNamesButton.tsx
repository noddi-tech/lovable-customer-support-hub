import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { syncCustomerFromNoddi } from '@/utils/customerSync';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizationStore } from '@/stores/organizationStore';

interface SyncCustomerNamesButtonProps {
  calls: any[];
}

export const SyncCustomerNamesButton: React.FC<SyncCustomerNamesButtonProps> = ({ calls }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedNonCustomers, setCachedNonCustomers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  // Load cached non-customers (phone numbers not found in Noddi)
  const loadCachedNonCustomers = async () => {
    const organizationId = currentOrganizationId || calls[0]?.organization_id;
    if (!organizationId) return;

    const { data: nonCustomerCache } = await supabase
      .from('noddi_customer_cache')
      .select('phone')
      .eq('organization_id', organizationId)
      .is('noddi_user_id', null);

    if (nonCustomerCache) {
      setCachedNonCustomers(new Set(nonCustomerCache.map(c => c.phone).filter(Boolean)));
      console.log(`📋 Loaded ${nonCustomerCache.length} cached non-customers`);
    }
  };

  useEffect(() => {
    loadCachedNonCustomers();
  }, [calls, currentOrganizationId]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    
    try {
      // Get organization ID from store or fallback to calls
      const organizationId = currentOrganizationId || calls[0]?.organization_id;
      
      console.log('🔍 Organization ID for sync:', { 
        currentOrganizationId, 
        fallbackFromCalls: calls[0]?.organization_id,
        finalOrganizationId: organizationId 
      });
      
      if (!organizationId) {
        console.error('❌ No organization ID available');
        throw new Error('No organization found');
      }

      // Find calls with missing customer names or customer_id
      const callsToSync = calls.filter(
        call => !call.customer_id || !call.customer_name || 
                call.customer_name === 'Unknown' || 
                call.customer_name === 'Unknown Customer' ||
                call.customer_name === 'Unknown Name'
      );

      if (callsToSync.length === 0) {
        toast({
          title: 'No Calls to Sync',
          description: 'All calls already have customer data',
        });
        setIsSyncing(false);
        return;
      }

      toast({
        title: 'Syncing Customer Data',
        description: `Step 1: Matching ${callsToSync.length} calls to local database...`,
      });

      // STEP 1: Match calls to existing customers in local database
      let localMatchCount = 0;
      const phoneGroups: { [phone: string]: typeof callsToSync } = {};
      
      callsToSync.forEach(call => {
        if (call.customer_phone) {
          if (!phoneGroups[call.customer_phone]) {
            phoneGroups[call.customer_phone] = [];
          }
          phoneGroups[call.customer_phone].push(call);
        }
      });

      for (const [phone, phoneCalls] of Object.entries(phoneGroups)) {
        try {
          // Look up customer in local database
          const { data: customer, error: lookupError } = await supabase
            .from('customers')
            .select('id, full_name, email')
            .eq('phone', phone)
            .eq('organization_id', organizationId)
            .maybeSingle();

          if (!lookupError && customer) {
            // Update all calls with this phone number
            const callIds = phoneCalls.map(c => c.id);
            
            const { error: updateError } = await supabase
              .from('calls')
              .update({
                customer_id: customer.id,
                customer_name: customer.full_name,
                customer_email: customer.email
              })
              .in('id', callIds);

            if (!updateError) {
              localMatchCount += callIds.length;
              console.log(`✅ Matched ${callIds.length} calls to local customer:`, customer.full_name);
            }
          }
        } catch (err) {
          console.error(`Error matching phone ${phone}:`, err);
        }
      }

      // Refresh data to see local matches
      await queryClient.invalidateQueries({ queryKey: ['calls'] });

      if (localMatchCount > 0) {
        toast({
          title: 'Local Match Complete',
          description: `✅ ${localMatchCount} calls matched to existing customers`,
        });
      }

      // STEP 2: Look up remaining unknowns in Noddi API
      // Refetch calls to see what's still missing
      const remainingUnknowns = callsToSync.filter(call => {
        const hasCustomerData = phoneGroups[call.customer_phone!]?.some(c => 
          localMatchCount > 0 // If we matched any, assume this phone was matched
        );
        return !hasCustomerData && call.customer_phone;
      });

      const uniqueRemainingPhones = [...new Set(
        remainingUnknowns
          .map(c => c.customer_phone)
          .filter(phone => phone && phone.trim() !== '')
      )];

      if (uniqueRemainingPhones.length > 0) {
        toast({
          title: 'Noddi API Lookup',
          description: `Step 2: Checking ${uniqueRemainingPhones.length} numbers with Noddi...`,
        });

        let noddiSuccessCount = 0;
        let errorCount = 0;

        for (const phone of uniqueRemainingPhones) {
          try {
            // Invoke Noddi lookup function
            const { data: noddiData, error: lookupError } = await supabase.functions.invoke(
              'noddi-customer-lookup',
              {
                body: { 
                  phone,
                  organizationId
                }
              }
            );

            if (lookupError) {
              console.error(`Error looking up ${phone}:`, lookupError);
              errorCount++;
              continue;
            }

            // If customer found in Noddi, sync to database
            if (noddiData?.data?.found) {
              const callsWithPhone = remainingUnknowns.filter(c => c.customer_phone === phone);
              
              if (noddiData.data.user && callsWithPhone.length > 0) {
                // Update EACH call with this phone number
                for (const call of callsWithPhone) {
                  await syncCustomerFromNoddi(
                    noddiData,
                    phone,
                    organizationId,
                    call.id
                  );
                }
                noddiSuccessCount += callsWithPhone.length;
              }
            } else {
              // Customer NOT found in Noddi - cache this result
              console.log(`❌ ${phone} not found in Noddi, caching result`);
              
              const { error: cacheError } = await supabase
                .from('noddi_customer_cache')
                .upsert({
                  phone,
                  email: null,
                  organization_id: organizationId,
                  noddi_user_id: null,
                  last_refreshed_at: new Date().toISOString(),
                  cached_customer_data: { found: false }
                }, {
                  onConflict: 'phone,organization_id'
                });
              
              if (cacheError) {
                console.error(`❌ Failed to cache ${phone}:`, cacheError);
              }
            }
          } catch (err) {
            console.error(`Exception syncing ${phone}:`, err);
            errorCount++;
          }
        }

        // Final summary
        const totalSuccess = localMatchCount + noddiSuccessCount;
        
        // Refresh data to show all updates
        await queryClient.invalidateQueries({ queryKey: ['calls'] });
        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        
        toast({
          title: 'Sync Complete',
          description: `✅ ${totalSuccess} updated (${localMatchCount} local, ${noddiSuccessCount} Noddi)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
          variant: errorCount > 0 && totalSuccess === 0 ? 'destructive' : 'default',
        });
      } else {
        // All matched locally
        toast({
          title: 'Sync Complete',
          description: `✅ All ${localMatchCount} calls matched from local database`,
        });
      }

      // Always reload cache after sync to update button count
      await loadCachedNonCustomers();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const callsNeedingSync = calls.filter(call => {
    const needsSync = !call.customer_name || 
                      call.customer_name === 'Unknown' || 
                      call.customer_name === 'Unknown Customer' ||
                      call.customer_name === 'Unknown Name';
    
    if (!needsSync) return false;
    
    // Exclude phone numbers already cached as non-customers
    if (call.customer_phone && cachedNonCustomers.has(call.customer_phone)) {
      return false;
    }
    
    return true;
  }).length;

  if (callsNeedingSync === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSyncAll}
      disabled={isSyncing}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      Sync {callsNeedingSync} Customer Name{callsNeedingSync !== 1 ? 's' : ''}
    </Button>
  );
};

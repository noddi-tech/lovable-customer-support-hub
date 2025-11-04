import React, { useState } from 'react';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

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

      // Find calls with missing customer names
      const callsToSync = calls.filter(
        call => !call.customer_name || 
                call.customer_name === 'Unknown' || 
                call.customer_name === 'Unknown Customer' ||
                call.customer_name === 'Unknown Name'
      );

      if (callsToSync.length === 0) {
        toast({
          title: 'No Calls to Sync',
          description: 'All calls already have customer names',
        });
        setIsSyncing(false);
        return;
      }

      // Group by unique phone numbers to avoid duplicate lookups
      const uniquePhones = [...new Set(
        callsToSync
          .map(c => c.customer_phone)
          .filter(phone => phone && phone.trim() !== '')
      )];

      toast({
        title: 'Syncing Customer Names',
        description: `Processing ${uniquePhones.length} unique phone numbers...`,
      });

      let successCount = 0;
      let errorCount = 0;

      // Process each unique phone number
      for (const phone of uniquePhones) {
        try {
          // Invoke Noddi lookup function
          const { data: noddiData, error: lookupError } = await supabase.functions.invoke(
            'noddi-customer-lookup',
            {
              body: { 
                phone,
                organizationId,
                forceRefresh: true 
              }
            }
          );

          if (lookupError) {
            console.error(`Error looking up ${phone}:`, lookupError);
            errorCount++;
            continue;
          }

          // If customer found, sync will happen automatically via the function
          if (noddiData?.data?.found) {
            // Find ALL calls with this phone number
            const callsWithPhone = callsToSync.filter(c => c.customer_phone === phone);
            
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
              successCount += callsWithPhone.length; // Count all updated calls
            }
          }
        } catch (err) {
          console.error(`Exception syncing ${phone}:`, err);
          errorCount++;
        }
      }

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      toast({
        title: 'Sync Complete',
        description: `✅ ${successCount} updated, ${errorCount} failed`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
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

  const callsNeedingSync = calls.filter(
    call => !call.customer_name || 
            call.customer_name === 'Unknown' || 
            call.customer_name === 'Unknown Customer' ||
            call.customer_name === 'Unknown Name'
  ).length;

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

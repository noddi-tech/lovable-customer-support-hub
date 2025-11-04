import { supabase } from '@/integrations/supabase/client';
import { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

/**
 * Syncs customer data from Noddi API to local database
 * Creates or updates customer record based on phone number
 */
export async function syncCustomerFromNoddi(
  noddiData: NoddiLookupResponse,
  phone: string,
  organizationId: string
): Promise<{ id: string } | null> {
  // Validate inputs
  if (!phone || phone.trim() === '') {
    console.error('[CustomerSync] ❌ Cannot sync: phone is required but was empty');
    return null;
  }

  if (!noddiData?.data?.found || !noddiData.data.user) {
    console.log('[CustomerSync] No Noddi data to sync');
    return null;
  }

  if (!organizationId) {
    console.error('[CustomerSync] ❌ Cannot sync: organizationId is required');
    return null;
  }

  const user = noddiData.data.user;
  
  // Construct full name from available fields
  const fullName = user.name || 
    (user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.firstName || user.lastName || 'Unknown Customer');

  console.log('[CustomerSync] 💾 Syncing customer to database:', { 
    phone, 
    fullName, 
    email: user.email,
    organizationId,
    noddiUserId: user.id
  });

  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        phone: phone,
        full_name: fullName,
        email: user.email || null,
        organization_id: organizationId,
        metadata: {
          noddi_user_id: user.id,
          user_group_id: user.userGroupId,
          synced_from_noddi: true,
          last_synced_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone,organization_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('[CustomerSync] Error syncing customer:', error);
      return null;
    }

    console.log('[CustomerSync] Customer synced successfully:', data?.id);
    return data;
  } catch (err) {
    console.error('[CustomerSync] Exception syncing customer:', err);
    return null;
  }
}

import { supabase } from '@/integrations/supabase/client';
import { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';
import { displayName } from '@/utils/noddiHelpers';

/**
 * Syncs customer data from Noddi API to local database
 * Creates or updates customer record based on phone number
 */
export async function syncCustomerFromNoddi(
  noddiData: NoddiLookupResponse,
  phone: string,
  organizationId: string,
  callId?: string
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
  const uiMeta = noddiData.data.ui_meta;
  
  // Find personal or default user group
  const userGroup = noddiData.data.all_user_groups?.find(
    (g: any) => g.is_personal || g.is_default
  ) || noddiData.data.all_user_groups?.[0];
  
  // Extract full name using comprehensive logic (same as NoddiCustomerDetails)
  let fullName: string;
  
  // 1. Try ui_meta.display_name (most reliable - already formatted by API)
  if (uiMeta?.display_name && uiMeta.display_name.trim()) {
    fullName = uiMeta.display_name.trim();
  }
  // 2. Try user group name (for personal accounts, this is the customer name)
  else if (userGroup?.name && userGroup.name.trim()) {
    fullName = userGroup.name.trim();
  }
  // 3. Use the displayName helper (handles all field variations)
  else {
    fullName = displayName(user, user.email, noddiData.data.priority_booking);
  }

  console.log('[CustomerSync] 💾 Syncing customer to database:', { 
    phone, 
    fullName, 
    email: user.email,
    organizationId,
    noddiUserId: user.id,
    sources: {
      uiMetaDisplayName: uiMeta?.display_name,
      userGroupName: userGroup?.name,
      fromHelper: displayName(user, user.email, noddiData.data.priority_booking)
    }
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
    
    // Also update the call record with customer data for immediate display
    if (callId && data) {
      console.log('[CustomerSync] 🔗 Updating call record with customer data:', { 
        callId, 
        customerId: data.id,
        fullName, 
        email: user.email 
      });
      const { error: callUpdateError } = await supabase
        .from('calls')
        .update({
          customer_id: data.id, // ← Set the foreign key relationship
          customer_name: fullName,
          customer_email: user.email || null
        })
        .eq('id', callId);
      
      if (callUpdateError) {
        console.error('[CustomerSync] Error updating call record:', callUpdateError);
      } else {
        console.log('[CustomerSync] ✅ Call record updated with customer_id');
      }
    }
    
    return data;
  } catch (err) {
    console.error('[CustomerSync] Exception syncing customer:', err);
    return null;
  }
}

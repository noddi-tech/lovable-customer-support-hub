import { supabase } from '@/integrations/supabase/client';
import { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';
import { displayName } from '@/utils/noddiHelpers';

/**
 * Syncs customer data from Noddi API to local database
 * Creates or updates customer record based on phone number
 *
 * Resilient to the (organization_id, lower(email)) unique index:
 * if a customer with the same email already exists in the org we
 * UPDATE that row instead of trying to INSERT a new one.
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

  if (uiMeta?.display_name && uiMeta.display_name.trim()) {
    fullName = uiMeta.display_name.trim();
  } else if (userGroup?.name && userGroup.name.trim()) {
    fullName = userGroup.name.trim();
  } else {
    fullName = displayName(user, user.email, noddiData.data.priority_booking);
  }

  const email = user.email?.trim() || null;

  console.log('[CustomerSync] 💾 Syncing customer to database:', {
    phone,
    fullName,
    email,
    organizationId,
    noddiUserId: user.id,
  });

  const metadata = {
    noddi_user_id: user.id,
    user_group_id: user.userGroupId,
    synced_from_noddi: true,
    last_synced_at: new Date().toISOString(),
  };

  const updateCallRecord = async (customerId: string) => {
    if (!callId) return;
    console.log('[CustomerSync] 🔗 Updating call record with customer data:', {
      callId,
      customerId,
      fullName,
      email,
    });
    const { error: callUpdateError } = await supabase
      .from('calls')
      .update({
        customer_id: customerId,
        customer_name: fullName,
        customer_email: email,
      })
      .eq('id', callId);

    if (callUpdateError) {
      console.error('[CustomerSync] Error updating call record:', callUpdateError);
    } else {
      console.log('[CustomerSync] ✅ Call record updated with customer_id');
    }
  };

  // Recovery path: find existing customer by email (case-insensitive) and UPDATE it.
  const updateExistingByEmail = async (): Promise<{ id: string } | null> => {
    if (!email) return null;
    const { data: existing, error: findErr } = await supabase
      .from('customers')
      .select('id, metadata')
      .eq('organization_id', organizationId)
      .ilike('email', email)
      .maybeSingle();

    if (findErr) {
      console.error('[CustomerSync] Error looking up by email:', findErr);
      return null;
    }
    if (!existing) return null;

    const mergedMetadata = {
      ...((existing.metadata as Record<string, any>) || {}),
      ...metadata,
    };

    const { data: updated, error: updateErr } = await supabase
      .from('customers')
      .update({
        phone,
        full_name: fullName,
        email,
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateErr) {
      console.error('[CustomerSync] Error updating existing customer by email:', updateErr);
      return null;
    }

    console.log('[CustomerSync] ✅ Updated existing customer by email:', updated?.id);
    await updateCallRecord(updated.id);
    return updated;
  };

  try {
    // 1. If we have an email, prefer updating an existing email-matched customer
    //    to avoid the (organization_id, lower(email)) unique-index conflict.
    if (email) {
      const existing = await updateExistingByEmail();
      if (existing) return existing;
    }

    // 2. Otherwise upsert by (phone, organization_id)
    const { data, error } = await supabase
      .from('customers')
      .upsert(
        {
          phone,
          full_name: fullName,
          email,
          organization_id: organizationId,
          metadata,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'phone,organization_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (error) {
      // 3. If we hit the email-unique index, recover by updating that row.
      if ((error as any).code === '23505') {
        console.warn(
          '[CustomerSync] 23505 on upsert — falling back to update-by-email:',
          error.message
        );
        const recovered = await updateExistingByEmail();
        if (recovered) return recovered;
      }
      console.error('[CustomerSync] Error syncing customer:', error);
      return null;
    }

    console.log('[CustomerSync] Customer synced successfully:', data?.id);
    if (data) await updateCallRecord(data.id);
    return data;
  } catch (err) {
    console.error('[CustomerSync] Exception syncing customer:', err);
    return null;
  }
}

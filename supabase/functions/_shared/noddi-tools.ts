// Noddi API tool execution functions
import { API_BASE, toOsloTime, extractPlateString } from './chat-utils.ts';

export async function executeLookupCustomer(phone?: string, email?: string, specifiedUserGroupId?: number): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Customer lookup not configured' });

  const headers: HeadersInit = {
    'Authorization': `Token ${noddiToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    const lookupUrl = new URL(`${API_BASE}/v1/users/customer-lookup-support/`);

    if (phone) {
      let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
      if (cleanPhone.startsWith('0047')) cleanPhone = '+47' + cleanPhone.slice(4);
      else if (cleanPhone.startsWith('+')) { /* already has international prefix */ }
      else if (/^\d{8}$/.test(cleanPhone)) cleanPhone = '+47' + cleanPhone;
      lookupUrl.searchParams.set('phone', cleanPhone);
      console.log(`[lookup] Looking up phone via customer-lookup-support: ${cleanPhone}`);
    }

    if (email) {
      lookupUrl.searchParams.set('email', email);
      console.log(`[lookup] Looking up email via customer-lookup-support: ${email}`);
    }

    const resp = await fetch(lookupUrl.toString(), { headers });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[lookup] customer-lookup-support error: ${resp.status} ${errText}`);

      let isNotFound = resp.status === 404;
      if (resp.status === 400) {
        try {
          const errorData = JSON.parse(errText);
          isNotFound = (errorData?.errors || []).some((err: any) =>
            err?.code === 'user_does_not_exist' || err?.detail?.includes('does not exist')
          );
        } catch { /* ignore parse error */ }
      }

      if (isNotFound) {
        return JSON.stringify({ found: false, message: 'No customer found with the provided information.' });
      }
      return JSON.stringify({ error: `Customer lookup failed (${resp.status})` });
    }

    const lookupData = await resp.json();
    const noddihUser = lookupData.user;
    const userGroups = lookupData.user_groups || [];

    if (!noddihUser) {
      return JSON.stringify({ found: false, message: 'No customer found with the provided information.' });
    }

    // If multiple user groups and no specific group requested, ask the user to choose
    if (!specifiedUserGroupId && userGroups.length > 1) {
      const groupOptions = userGroups.map((g: any) => ({
        id: g.id,
        name: g.name || `Gruppe ${g.id}`,
        is_personal: g.is_personal || false,
        is_default: g.is_default_user_group || false,
        total_bookings: g.bookings_summary?.total_bookings || 0,
      }));
      return JSON.stringify({
        found: true,
        needs_group_selection: true,
        customer: {
          name: `${noddihUser.first_name || ''} ${noddihUser.last_name || ''}`.trim() || noddihUser.name || '',
          email: noddihUser.email,
          phone: noddihUser.phone,
          userId: noddihUser.id,
        },
        user_groups: groupOptions,
        message: `Kunden er medlem av ${groupOptions.length} grupper. Be kunden velge hvilken gruppe det gjelder.`,
      });
    }

    const userGroupId = specifiedUserGroupId
      || userGroups.find((g: any) => g.is_default_user_group)?.id
      || userGroups.find((g: any) => g.is_personal)?.id
      || userGroups[0]?.id;

    let bookings: any[] = [];
    const seenBookingIds = new Set<number>();

    const selectedGroup = userGroups.find((g: any) => g.id === userGroupId);
    if (selectedGroup) {
      const pb = selectedGroup.bookings_summary?.priority_booking;
      if (pb?.id && !seenBookingIds.has(pb.id)) {
        bookings.push(pb);
        seenBookingIds.add(pb.id);
      }
      const upcoming = selectedGroup.bookings_summary?.upcoming_bookings;
      if (Array.isArray(upcoming)) {
        for (const ub of upcoming) {
          if (ub?.id && !seenBookingIds.has(ub.id)) {
            bookings.push(ub);
            seenBookingIds.add(ub.id);
          }
        }
      }
    }

    for (const ub of (lookupData.unpaid_bookings || [])) {
      if (ub?.id && !seenBookingIds.has(ub.id) && (!ub.user_group_id || ub.user_group_id === userGroupId)) {
        bookings.push(ub);
        seenBookingIds.add(ub.id);
      }
    }

    console.log(`[lookup] Extracted ${bookings.length} bookings from customer-lookup-support response`);

    if (userGroupId) {
      try {
        const bfcResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/?page_size=20`, {
          headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json' },
        });
        if (bfcResp.ok) {
          const bfcData = await bfcResp.json();
          const results = Array.isArray(bfcData) ? bfcData : (bfcData.results || []);
          for (const fb of results) {
            if (fb?.id && seenBookingIds.has(fb.id)) {
              const idx = bookings.findIndex((b: any) => b.id === fb.id);
              if (idx >= 0) bookings[idx] = fb;
            } else if (fb?.id && !seenBookingIds.has(fb.id)) {
              bookings.push(fb);
              seenBookingIds.add(fb.id);
            }
          }
          console.log(`[lookup] Full bookings from bookings-for-customer: ${results.length} results`);
          if (results.length > 0) {
            console.log('[lookup] Sample booking keys:', Object.keys(results[0]));
            console.log('[lookup] Sample booking car fields:', JSON.stringify({
              car: results[0].car,
              cars: results[0].cars,
              booking_items_car: results[0].booking_items_car,
              booking_items: results[0].booking_items,
              address: results[0].address,
              user_group_address: results[0].user_group_address,
            }));
          }
        }
      } catch (e) { console.error('[lookup] bookings-for-customer failed:', e); }
    }

    const name = `${noddihUser.first_name || ''} ${noddihUser.last_name || ''}`.trim()
      || noddihUser.name || '';

    const storedAddresses = new Map<number, any>();
    const storedCars = new Map<number, any>();

    for (const b of bookings) {
      if (b.address?.id) {
        const streetNum = b.address.street_number || '';
        const streetName = b.address.street_name || '';
        const zip = b.address.zip_code || '';
        const city = b.address.city || '';
        const label = `${streetName} ${streetNum}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim();
        storedAddresses.set(b.address.id, {
          id: b.address.id,
          full_address: label,
          street: streetName,
          city,
          zip,
        });
      }
      if (b.car?.id) {
        storedCars.set(b.car.id, {
          id: b.car.id,
          make: b.car.make || '',
          model: b.car.model || '',
          license_plate: extractPlateString(b.car.license_plate_number || b.car.license_plate || b.car.registration),
        });
      }
      if (Array.isArray(b.cars)) {
        for (const car of b.cars) {
          if (car?.id && !storedCars.has(car.id)) {
            storedCars.set(car.id, {
              id: car.id,
              make: car.make || '',
              model: car.model || '',
              license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
            });
          }
        }
      }
      if (Array.isArray(b.booking_items_car)) {
        for (const bic of b.booking_items_car) {
          const car = bic.car || bic;
          if (car?.id && !storedCars.has(car.id)) {
            storedCars.set(car.id, {
              id: car.id,
              make: car.make || car.brand || '',
              model: car.model || '',
              license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
            });
          }
        }
      }
      if (Array.isArray(b.booking_items)) {
        for (const bi of b.booking_items) {
          const car = bi.car || bi;
          if (car?.id && !storedCars.has(car.id)) {
            storedCars.set(car.id, {
              id: car.id,
              make: car.make || car.brand || '',
              model: car.model || '',
              license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
            });
          }
        }
      }
    }

    for (const group of userGroups) {
      if (Array.isArray((group as any).addresses)) {
        for (const addr of (group as any).addresses) {
          if (addr?.id && !storedAddresses.has(addr.id)) {
            const label = `${addr.street_name || ''} ${addr.street_number || ''}, ${addr.zip_code || ''} ${addr.city || ''}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim();
            storedAddresses.set(addr.id, {
              id: addr.id,
              full_address: label,
              street: addr.street_name || '',
              city: addr.city || '',
              zip: addr.zip_code || '',
            });
          }
        }
      }
    }

    return JSON.stringify({
      found: true,
      customer: {
        name,
        email: noddihUser.email,
        phone: noddihUser.phone,
        userId: noddihUser.id,
        userGroupId,
        userGroupName: selectedGroup?.name || '',
        allUserGroups: userGroups.map((g: any) => ({ id: g.id, name: g.name, is_personal: g.is_personal })),
      },
      stored_addresses: Array.from(storedAddresses.values()),
      stored_cars: Array.from(storedCars.values()),
      bookings: (() => {
        const STATUS_MAP: Record<number, string> = { 0: 'draft', 1: 'confirmed', 2: 'assigned', 3: 'cancelled', 4: 'completed' };
        const mappedBookings = bookings
        .filter((b: any) => {
          const rawStatus = b.status;
          const status = (
            typeof rawStatus === 'number' ? (STATUS_MAP[rawStatus] || '')
            : typeof rawStatus === 'string' ? rawStatus
            : typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus.name || rawStatus.slug || STATUS_MAP[rawStatus.id ?? rawStatus.value] || rawStatus.label || String(rawStatus.id ?? rawStatus.value ?? ''))
            : ''
          ).toLowerCase();
          if (['completed', 'cancelled', 'canceled', 'no_show', 'expired', 'draft'].includes(status)) {
            return false;
          }
          const endTime = b.end_time || b.delivery_window_ends_at || b.delivery_window?.ends_at || b.deliveryWindowEndsAt;
          if (endTime && new Date(endTime) < new Date()) {
            return false;
          }
          return true;
        })
        .slice(0, 10).map((b: any) => {
          const rawSt = b.status;
          const statusStr = typeof rawSt === 'number' ? (STATUS_MAP[rawSt] || String(rawSt))
            : typeof rawSt === 'string' ? rawSt
            : typeof rawSt === 'object' && rawSt !== null ? (rawSt.name || rawSt.slug || STATUS_MAP[rawSt.id ?? rawSt.value] || rawSt.label || '') : '';
          const startFull = toOsloTime(b.start_time || b.scheduled_at || b.delivery_window_starts_at || b.delivery_window?.starts_at || b.deliveryWindowStartsAt || '');
          const endFull = toOsloTime(b.end_time || b.delivery_window_ends_at || b.delivery_window?.ends_at || b.deliveryWindowEndsAt || '');
          const startHM = startFull.split(', ')[1] || startFull;
          const endHM = endFull.split(', ')[1] || endFull;
          return {
            id: b.id,
            status: statusStr,
            scheduledAt: startFull,
            endTime: endFull,
            timeSlot: `${startHM}\u2013${endHM}`,
            address: (() => {
              const addrObj = b.address || b.delivery_address || b.order?.delivery_address;
              if (!addrObj) return null;
              if (typeof addrObj === 'string') return addrObj;
              const sn = addrObj.street_name || '';
              const num = addrObj.street_number || '';
              const zip = addrObj.zip_code || '';
              const city = addrObj.city || '';
              return `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
            })(),
            address_id: b.address?.id || b.user_group_address?.id || null,
            services: (() => {
              const lines = b.order_lines || b.items || b.sales_items || b.services || [];
              if (Array.isArray(lines) && lines.length > 0) {
                return lines.map((ol: any) => typeof ol === 'string' ? ol : (ol.service_name || ol.name || '')).filter(Boolean);
              }
              if (Array.isArray(b.service_categories) && b.service_categories.length > 0) {
                return b.service_categories.map((sc: any) => sc.name || sc.label || '').filter(Boolean);
              }
              if (Array.isArray(b.booking_items_car)) {
                const names: string[] = [];
                for (const bic of b.booking_items_car) {
                  if (Array.isArray(bic.sales_items)) {
                    for (const si of bic.sales_items) { if (si.name) names.push(si.name); }
                  }
                }
                if (names.length > 0) return names;
              }
              if (b.order?.lines && Array.isArray(b.order.lines) && b.order.lines.length > 0) {
                return b.order.lines.map((ol: any) => ol.name || ol.title || '').filter(Boolean);
              }
              if (b.service?.name) return [b.service.name];
              if (b.service_name) return [b.service_name];
              return [];
            })(),
            sales_item_ids: (() => {
              const lines = b.order_lines || b.items || b.sales_items || [];
              if (Array.isArray(lines)) {
                return lines.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean);
              }
              return [];
            })(),
            vehicle: (() => {
              const c = b.car || (Array.isArray(b.cars) && b.cars[0]) || null;
              if (c) {
                const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
                return `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
              }
              if (Array.isArray(b.booking_items_car) && b.booking_items_car[0]?.car) {
                const bic = b.booking_items_car[0].car;
                const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
                return `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
              }
              if (Array.isArray(b.booking_items) && b.booking_items[0]?.car) {
                const bic = b.booking_items[0].car;
                const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
                return `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
              }
              const carId = b.car?.id || (Array.isArray(b.cars) && b.cars[0]?.id) || null;
              if (carId && storedCars.has(carId)) {
                const sc = storedCars.get(carId);
                return `${sc.make} ${sc.model} ${sc.license_plate ? `(${sc.license_plate})` : ''}`.trim() || null;
              }
              if (storedCars.size === 1) {
                const sc = Array.from(storedCars.values())[0];
                return `${sc.make} ${sc.model} ${sc.license_plate ? `(${sc.license_plate})` : ''}`.trim() || null;
              }
              return null;
            })(),
            car_id: b.car?.id || (Array.isArray(b.cars) && b.cars[0]?.id) || null,
            car_ids: Array.isArray(b.cars) ? b.cars.map((c: any) => c.id).filter(Boolean) : (b.car?.id ? [b.car.id] : []),
            license_plate: extractPlateString(b.car?.license_plate_number || b.car?.license_plate || b.car?.registration) || (Array.isArray(b.cars) && b.cars[0] ? extractPlateString(b.cars[0].license_plate_number || b.cars[0].license_plate || b.cars[0].registration) : ''),
          };
        });
        if (mappedBookings.length > 0) {
          console.log('[lookup] Mapped sample:', JSON.stringify(
            mappedBookings.slice(0, 2).map((b: any) => ({
              id: b.id, vehicle: b.vehicle, license_plate: b.license_plate, services: b.services
            }))
          ));
        }
        return mappedBookings;
      })(),
    });
  } catch (err) {
    console.error('[widget-ai-chat] Customer lookup error:', err);
    return JSON.stringify({ error: 'Customer lookup failed' });
  }
}

export async function executeGetBookingDetails(bookingId: number): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking lookup not configured' });

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/`, {
      headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      console.error(`[executeGetBookingDetails] Failed for booking_id=${bookingId}: status=${resp.status}`);
      return JSON.stringify({ error: resp.status === 404 ? 'Booking not found' : `Booking lookup failed (${resp.status})` });
    }

    const booking = await resp.json();
    const rawSt2 = booking.status;
    const statusStr2 = typeof rawSt2 === 'string' ? rawSt2
      : typeof rawSt2 === 'object' && rawSt2 !== null ? (rawSt2.name || rawSt2.slug || '') : '';
    const startFull2 = toOsloTime(booking.start_time || booking.scheduled_at || '');
    const endFull2 = toOsloTime(booking.end_time || '');
    const startHM2 = startFull2.split(', ')[1] || startFull2;
    const endHM2 = endFull2.split(', ')[1] || endFull2;
    return JSON.stringify({
      id: booking.id,
      status: statusStr2,
      scheduledAt: startFull2,
      endTime: endFull2,
      timeSlot: `${startHM2}\u2013${endHM2}`,
      services: booking.order_lines?.map((ol: any) => ({ name: ol.service_name || ol.name, price: ol.price })) || [],
      sales_item_ids: booking.order_lines?.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean) || [],
      address: booking.address?.full_address || booking.address || null,
      address_id: booking.address?.id || booking.user_group_address?.id || null,
      vehicle: booking.car ? { make: booking.car.make, model: booking.car.model, licensePlate: booking.car.license_plate, year: booking.car.year } : null,
      car_id: booking.car?.id || null,
      car_ids: Array.isArray(booking.cars) ? booking.cars.map((c: any) => c.id).filter(Boolean) : (booking.car?.id ? [booking.car.id] : []),
      license_plate: booking.car?.license_plate_number || booking.car?.license_plate || '',
      totalPrice: booking.total_price,
      notes: booking.customer_notes || null,
    });
  } catch (err) {
    console.error('[widget-ai-chat] Booking details error:', err);
    return JSON.stringify({ error: 'Failed to fetch booking details' });
  }
}

export async function executeRescheduleBooking(bookingId: number, newDate: string): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking modification not configured' });

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/reschedule/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_start_time: newDate }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[widget-ai-chat] Reschedule failed:', resp.status, errorBody);
      if (resp.status === 404) return JSON.stringify({ success: false, error: 'Booking not found' });
      if (resp.status === 400) return JSON.stringify({ success: false, error: 'The requested time slot is not available. Please try a different time.' });
      return JSON.stringify({ success: false, error: 'Rescheduling failed. Please try again or contact support.' });
    }

    const data = await resp.json();
    return JSON.stringify({
      success: true,
      message: 'Booking rescheduled successfully',
      newScheduledAt: data.start_time || data.scheduled_at || newDate,
    });
  } catch (err) {
    console.error('[widget-ai-chat] Reschedule error:', err);
    return JSON.stringify({ success: false, error: 'Rescheduling failed' });
  }
}

export async function executeCancelBooking(bookingId: number, reason?: string): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking modification not configured' });

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/cancel/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${noddiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booking_id: bookingId,
        notify_customer: true,
      }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[widget-ai-chat] Cancel failed:', resp.status, errorBody);
      if (resp.status === 404) return JSON.stringify({ success: false, error: 'Booking not found' });
      if (resp.status === 400) return JSON.stringify({ success: false, error: 'This booking cannot be cancelled. It may already be completed or cancelled.' });
      return JSON.stringify({ success: false, error: 'Cancellation failed. Please contact support.' });
    }

    return JSON.stringify({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('[widget-ai-chat] Cancel error:', err);
    return JSON.stringify({ success: false, error: 'Cancellation failed' });
  }
}

export async function executeBookingProxy(payload: Record<string, any>): Promise<string> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/noddi-booking-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) return JSON.stringify({ error: data.error || 'Booking proxy call failed' });
    return JSON.stringify(data);
  } catch (err) {
    console.error('[widget-ai-chat] Booking proxy error:', err);
    return JSON.stringify({ error: 'Booking proxy call failed' });
  }
}

export async function executeSearchKnowledge(
  query: string,
  organizationId: string,
  supabase: any,
  openaiApiKey: string,
): Promise<string> {
  try {
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: String(query).slice(0, 8000),
      }),
    });

    if (!embeddingResp.ok) {
      console.error('[widget-ai-chat] Embedding failed:', await embeddingResp.text());
      return JSON.stringify({ error: 'Search temporarily unavailable' });
    }

    const embeddingData = await embeddingResp.json();
    const embedding = embeddingData?.data?.[0]?.embedding;
    if (!embedding) {
      return JSON.stringify({ error: 'No embedding returned' });
    }

    // Use hybrid search (vector + full-text + freshness)
    const { data: results, error } = await supabase.rpc('hybrid_search_knowledge', {
      query_embedding: embedding,
      query_text: String(query).slice(0, 500),
      org_id: organizationId,
      match_count: 5,
    });

    if (error) {
      console.error('[widget-ai-chat] Knowledge search error:', error);
      return JSON.stringify({ error: 'Search failed' });
    }

    if (!results || results.length === 0) {
      return JSON.stringify({ results: [], message: 'No relevant knowledge base entries found.' });
    }

    return JSON.stringify({
      results: results.map((r: any) => ({
        question: r.customer_context,
        answer: r.agent_response,
        category: r.category,
        similarity: r.similarity,
      })),
    });
  } catch (err) {
    console.error('[widget-ai-chat] Knowledge search error:', err);
    return JSON.stringify({ error: 'Search failed' });
  }
}

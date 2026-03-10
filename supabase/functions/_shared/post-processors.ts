// Post-processor functions for widget-ai-chat responses
import { extractPlateString } from './chat-utils.ts';
import { executeLookupCustomer } from './noddi-tools.ts';

export async function patchBookingSummary(reply: string, messages: any[], visitorPhone?: string, visitorEmail?: string): Promise<string> {
  const marker = '[BOOKING_SUMMARY]';
  const closingMarker = '[/BOOKING_SUMMARY]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return reply;

  const jsonStr = reply.slice(startIdx + marker.length, endIdx);
  let summaryData: any;
  try {
    summaryData = JSON.parse(jsonStr);
  } catch {
    console.warn('[patchBookingSummary] Failed to parse BOOKING_SUMMARY JSON, attempting reconstruction from context');
    summaryData = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        try {
          const actionData = JSON.parse(msg.content);
          if (actionData.delivery_window_id && !summaryData.delivery_window_id) {
            summaryData.delivery_window_id = actionData.delivery_window_id;
            if (actionData.start_time) summaryData.delivery_window_start = actionData.start_time;
            if (actionData.end_time) summaryData.delivery_window_end = actionData.end_time;
          }
          if (actionData.address_id && !summaryData.address_id) summaryData.address_id = actionData.address_id;
          if (actionData.license_plate && !summaryData.license_plate) summaryData.license_plate = actionData.license_plate;
          if (actionData.sales_item_ids && !summaryData.sales_item_ids) summaryData.sales_item_ids = actionData.sales_item_ids;
          if (actionData.sales_item_id && !summaryData.sales_item_ids) summaryData.sales_item_ids = [actionData.sales_item_id];
        } catch { /* not JSON */ }
      }
    }
    const dateMatch = jsonStr.match(/(\d{1,2}\.\s*\w+\s*\d{4})/);
    if (dateMatch) summaryData.date = dateMatch[1];
    const priceMatch = jsonStr.match(/(\d+)\s*kr/i);
    if (priceMatch) summaryData.price = priceMatch[0];
    const timeMatch = jsonStr.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
    if (timeMatch) summaryData.time = timeMatch[0];
    console.log('[patchBookingSummary] Reconstructed data:', JSON.stringify(summaryData));
  }

  let patched = false;

  let selectedGroupId: number | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && typeof msg.content === 'string') {
      try {
        const d = JSON.parse(msg.content);
        if (d.action === 'group_selected' && d.user_group_id) {
          selectedGroupId = d.user_group_id;
          break;
        }
      } catch {}
    }
  }

  if (visitorPhone || visitorEmail) {
    let foundInContext = false;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const toolResult = JSON.parse(msg.content);
          if (toolResult.customer?.userId) {
            summaryData.user_id = toolResult.customer.userId;
            patched = true;
            foundInContext = true;
          }
          if (toolResult.customer?.userGroupId) {
            summaryData.user_group_id = toolResult.customer.userGroupId;
            patched = true;
            foundInContext = true;
          }
          if (foundInContext) {
            console.log('[patchBookingSummary] Got customer IDs from cached context');
            break;
          }
        } catch {}
      }
    }
    if (!foundInContext) {
      console.log('[patchBookingSummary] No cached customer data, performing fresh lookup, selectedGroupId:', selectedGroupId);
      try {
        const lookupResult = JSON.parse(await executeLookupCustomer(visitorPhone, visitorEmail, selectedGroupId));
        if (lookupResult.customer?.userId) { summaryData.user_id = lookupResult.customer.userId; patched = true; }
        if (lookupResult.customer?.userGroupId) { summaryData.user_group_id = lookupResult.customer.userGroupId; patched = true; }
      } catch (e) { console.error('[patchBookingSummary] Customer re-lookup failed:', e); }
    }
  } else if (!summaryData.user_id || !summaryData.user_group_id) {
    console.warn('[patchBookingSummary] Missing customer IDs but no visitorPhone/visitorEmail available');
  }

  if (!summaryData.delivery_window_id || summaryData.delivery_window_id === 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        try {
          const actionData = JSON.parse(msg.content);
          if (actionData.delivery_window_id) {
            summaryData.delivery_window_id = actionData.delivery_window_id;
            patched = true;
            break;
          }
        } catch { /* not JSON */ }
      }
    }
  }

  if (patched) {
    console.log('[patchBookingSummary] Injected missing fields:', {
      user_id: summaryData.user_id,
      user_group_id: summaryData.user_group_id,
      delivery_window_id: summaryData.delivery_window_id,
    });
    const patchedJson = JSON.stringify(summaryData);
    return reply.slice(0, startIdx) + marker + patchedJson + closingMarker + reply.slice(endIdx + closingMarker.length);
  }

  return reply;
}

export function patchYesNo(reply: string, messages?: any[]): string {
  if (reply.includes('[YES_NO]') && !reply.includes('[/YES_NO]')) {
    const bareRemoved = reply.replace(/\[YES_NO\]/g, '').trim();
    const qMatch = bareRemoved.match(/([^\n.]{10,150}\?)\s*$/);
    if (qMatch) {
      const before = bareRemoved.substring(0, qMatch.index!).trimEnd();
      return [before, `[YES_NO]${qMatch[1]}[/YES_NO]`]
        .filter(s => s.length > 0).join('\n');
    }
  }
  if (reply.includes('[YES_NO]') && reply.includes('[/YES_NO]')) {
    const yesNoMatch = reply.match(/\[YES_NO\]([\s\S]*?)\[\/YES_NO\]/);
    if (yesNoMatch) {
      return `[YES_NO]${yesNoMatch[1]}[/YES_NO]`;
    }
    return reply;
  }
  const otherMarkers = ['[ACTION_MENU]', '[TIME_SLOT]', '[BOOKING_EDIT]', '[BOOKING_SUMMARY]', '[SERVICE_SELECT]', '[PHONE_VERIFY]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[BOOKING_CONFIRMED]', '[CONFIRM]', '[BOOKING_SELECT]'];
  if (otherMarkers.some(m => reply.includes(m))) return reply;

  if (messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') continue;
      try { const p = JSON.parse(messages[i].content); if (p.delivery_window_id) return reply; } catch {}
      break;
    }
  }

  if (/(?:tidspunkt|adresse|bil).*(?:tidspunkt|adresse|bil)/is.test(reply)) return reply;
  if (/\n\s*\d+\.\s/.test(reply)) return reply;
  if (/\bhvilke[nt]?\b/i.test(reply)) return reply;

  const patterns = [
    /Er dette bestillingen du ønsker å endre\??/i,
    /Er dette riktig\??/i,
    /Ønsker du å (bekrefte|endre|avbestille|kansellere)\b.*\??/i,
    /Vil du (bekrefte|endre|avbestille|fortsette)\b.*\??/i,
    /Stemmer dette\??/i,
    /Er det korrekt\??/i,
    /Do you want to (confirm|change|cancel|proceed)\b.*\??/i,
    /Is this correct\??/i,
    /Would you like to (confirm|change|cancel|proceed)\b.*\??/i,
    /Skal vi gå videre\b.*\??/i,
    /(?:Kan|Kunne) du bekrefte\b.*\?/i,
    /(?:Stemmer|Passer) (?:det|dette)\b.*\?/i,
    /Er du sikker\b.*\?/i,
    /Er dette korrekt\??/i,
    /Vil du at vi\b.*\??/i,
  ];

  if (!patterns.some(p => p.test(reply))) {
    const confirmKeywords = /\b(riktig|korrekt|bekrefte|endre|correct|confirm|want to|ønsker|stemmer|passer|sikker)\b/i;
    const shortQuestion = reply.match(/([^\n.]{10,120}\?)\s*$/);
    if (shortQuestion && confirmKeywords.test(shortQuestion[1]) && !/\[/.test(reply)) {
      const question = shortQuestion[1];
      const before = reply.substring(0, shortQuestion.index!).trimEnd();
      const parts = [before, `[YES_NO]${question}[/YES_NO]`].filter(s => s.length > 0);
      return parts.join('\n');
    }
  }

  for (const pattern of patterns) {
    const match = reply.match(pattern);
    if (match) {
      const question = match[0];
      const before = reply.substring(0, match.index!).trimEnd();
      const after = reply.substring(match.index! + question.length).trimStart();
      const parts = [before, `[YES_NO]${question}[/YES_NO]`, after].filter(s => s.length > 0);
      return parts.join('\n');
    }
  }
  return reply;
}

export function patchBookingSummaryTime(reply: string): string {
  const re = /\[BOOKING_SUMMARY\]([\s\S]*?)\[\/BOOKING_SUMMARY\]/;
  const m = reply.match(re);
  if (!m) return reply;
  try {
    const data = JSON.parse(m[1].trim());
    const dwStart = data.delivery_window_start;
    const dwEnd = data.delivery_window_end;
    if (dwStart && dwEnd) {
      const startD = new Date(dwStart);
      const endD = new Date(dwEnd);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        const fmt = (d: Date) => d.toLocaleString('nb-NO', {
          timeZone: 'Europe/Oslo',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        data.time = `${fmt(startD)}\u2013${fmt(endD)}`;
      }
    }
    if (dwStart && (!data.date || /^\d{4}-\d{2}-\d{2}/.test(data.date))) {
      const d = new Date(dwStart);
      data.date = d.toLocaleDateString('nb-NO', {
        timeZone: 'Europe/Oslo',
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    }
    return reply.replace(re, `[BOOKING_SUMMARY]${JSON.stringify(data)}[/BOOKING_SUMMARY]`);
  } catch { return reply; }
}

function didCancelBookingSucceed(messages: any[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant') break;
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const r = JSON.parse(msg.content);
        if (r.success && (r.action === 'cancelled' || r.message?.toLowerCase().includes('cancelled') || r.message?.toLowerCase().includes('kansellert'))) return true;
      } catch {}
    }
  }
  return false;
}

export function patchBookingInfo(reply: string, messages: any[]): string {
  if (reply.includes('[BOOKING_INFO]')) return reply;
  if (reply.includes('[BOOKING_CONFIRMED]')) return reply;
  if (didCancelBookingSucceed(messages)) return reply;
  const activeFlowMarkers = ['[TIME_SLOT]', '[BOOKING_EDIT]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[SERVICE_SELECT]', '[BOOKING_SUMMARY]'];
  if (activeFlowMarkers.some(m => reply.includes(m))) return reply;
  
  let bookingData: any = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const toolResult = JSON.parse(msg.content);
        if (toolResult.bookings && toolResult.bookings.length > 1) {
          const bookingsPayload = toolResult.bookings.map((b: any) => ({
            id: b.id,
            service: Array.isArray(b.services) ? b.services.join(', ') : (b.service || 'Bestilling'),
            date: b.scheduledAt?.split(',')[0] || b.timeSlot || '',
            time: b.timeSlot || '',
            address: b.address || '',
            vehicle: b.vehicle || '',
            license_plate: b.license_plate || '',
          }));
          const marker = `Du har ${toolResult.bookings.length} aktive bestillinger. Velg hvilke(n) det gjelder:\n\n[BOOKING_SELECT]${JSON.stringify(bookingsPayload)}[/BOOKING_SELECT]`;
          console.log('[patchBookingInfo] Multiple bookings detected, showing BOOKING_SELECT carousel');
          return marker;
        }
        
        let candidate: any = null;
        if (toolResult.booking) candidate = toolResult.booking;
        else if (toolResult.bookings?.[0]) candidate = toolResult.bookings[0];
        else if (toolResult.id && toolResult.scheduledAt) candidate = toolResult;
        
        if (candidate) {
          if (!bookingData) bookingData = candidate;
          if (candidate.address && candidate.vehicle) {
            bookingData = candidate;
            break;
          }
          if (candidate.address && (candidate.vehicle || candidate.license_plate)) {
            bookingData = candidate;
            break;
          }
        }
      } catch { /* not JSON */ }
    }
  }
  
  if (!bookingData) return reply;
  console.log('[patchBookingInfo] CONTEXT-BASED trigger: found booking data in tool results, injecting [BOOKING_INFO]');
  
  const info: any = {};
  if (bookingData.id) info.booking_id = bookingData.id;
  if (bookingData.address) {
    info.address = typeof bookingData.address === 'string' ? bookingData.address : (bookingData.address.address || bookingData.address.full_address || '');
  }
  if (bookingData.scheduledAt) {
    const datePart = bookingData.scheduledAt.split(',')[0] || bookingData.scheduledAt;
    info.date = datePart.trim();
  } else if (bookingData.start_time) {
    try {
      const d = new Date(bookingData.start_time);
      info.date = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { /* ignore */ }
  }
  if (bookingData.timeSlot) {
    info.time = bookingData.timeSlot;
  } else if (bookingData.start_time && bookingData.end_time) {
    try {
      const s = new Date(bookingData.start_time);
      const e = new Date(bookingData.end_time);
      info.time = `${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')}–${e.getHours().toString().padStart(2,'0')}:${e.getMinutes().toString().padStart(2,'0')}`;
    } catch { /* ignore */ }
  }
  const svcSource = bookingData.services || bookingData.order_lines || bookingData.items || bookingData.sales_items || [];
  if (Array.isArray(svcSource) && svcSource.length > 0) {
    const allNames = svcSource
      .map((s: any) => typeof s === 'string' ? s : (s.service_name || s.name || ''))
      .filter(Boolean);
    if (allNames.length > 0) info.service = allNames.join(', ');
  }
  if (bookingData.vehicle) {
    info.car = typeof bookingData.vehicle === 'string' ? bookingData.vehicle : `${bookingData.vehicle.make || ''} ${bookingData.vehicle.model || ''} (${bookingData.vehicle.licensePlate || ''})`.trim();
  } else if (bookingData.car && typeof bookingData.car === 'object') {
    const c = bookingData.car;
    const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
    info.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  } else if (bookingData.cars?.[0]) {
    const car = bookingData.cars[0];
    const plate = extractPlateString(car.license_plate_number || car.license_plate || car.registration);
    info.car = `${car.make || ''} ${car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  }
  if (!info.car && bookingData.license_plate) {
    info.car = bookingData.license_plate;
  }
  if (!info.car && Array.isArray(bookingData.booking_items_car) && bookingData.booking_items_car[0]?.car) {
    const bic = bookingData.booking_items_car[0].car;
    const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
    info.car = `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  }
  if (!info.time && bookingData.delivery_window_starts_at && bookingData.delivery_window_ends_at) {
    try {
      const s = new Date(bookingData.delivery_window_starts_at);
      const e = new Date(bookingData.delivery_window_ends_at);
      info.time = `${s.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}–${e.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}`;
      if (!info.date) info.date = s.toLocaleDateString('nb-NO', {day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'});
    } catch {}
  }
  if (!info.service && Array.isArray(bookingData.service_categories) && bookingData.service_categories.length > 0) {
    const catNames = bookingData.service_categories.map((sc: any) => sc.name || sc.label || '').filter(Boolean);
    if (catNames.length > 0) info.service = catNames.join(', ');
  }
  if (!info.service && Array.isArray(bookingData.booking_items_car)) {
    const allSiNames: string[] = [];
    for (const bic of bookingData.booking_items_car) {
      if (Array.isArray(bic.sales_items)) {
        for (const si of bic.sales_items) { if (si.name) allSiNames.push(si.name); }
      }
    }
    if (allSiNames.length > 0) info.service = allSiNames.join(', ');
  }
  if (!info.address && bookingData.address && typeof bookingData.address === 'object' && !bookingData.address.full_address && !bookingData.address.address) {
    const a = bookingData.address;
    const addr = `${a.street_name || ''} ${a.street_number || ''}, ${a.zip_code || ''} ${a.city || ''}`.replace(/\s+/g,' ').trim().replace(/^,|,$/g,'').trim();
    if (addr) info.address = addr;
  }
  
  const infoMarker = `[BOOKING_INFO]${JSON.stringify(info)}[/BOOKING_INFO]`;
  
  let cleaned = reply;
  cleaned = cleaned.replace(/^[\s-]*(?:📍\s*)?Adresse\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:📅\s*)?Dato\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:🕐\s*)?Tid\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:🛠️?\s*)?Tjeneste\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:🚗\s*)?Bil\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:💰\s*)?Pris\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^.*(?:ikke fikk tilgang|couldn't access|ikke finne detalj|kunne ikke hente).*$/gim, '');
  cleaned = cleaned.replace(/^.*(?:Her er|detaljer).*:?\s*$/gim, '');
  cleaned = cleaned.replace(/^.*(?:planlagt bestilling|har en bestilling|din bestilling|bestilling den).*$/gim, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  const actionIdx = cleaned.indexOf('[ACTION_MENU]');
  if (actionIdx > -1) {
    cleaned = cleaned.slice(0, actionIdx) + infoMarker + '\n\n' + cleaned.slice(actionIdx);
  } else {
    cleaned = infoMarker + '\n\n' + (cleaned || 'Hva ønsker du å gjøre med denne bestillingen?');
  }
  
  console.log('[patchBookingInfo] Auto-wrapped booking details into [BOOKING_INFO]');
  return cleaned;
}

export function patchActionMenu(reply: string, messages: any[]): string {
  if (/(?:kansellere|avbestille|cancel).*\?/is.test(reply)) return reply;
  if (reply.includes('[BOOKING_SELECT]')) return reply;
  if (didCancelBookingSucceed(messages)) return reply;
  const hasCompleteActionMenu = reply.includes('[ACTION_MENU]') && reply.includes('[/ACTION_MENU]');
  if (hasCompleteActionMenu) {
    const menuMatch = reply.match(/\[ACTION_MENU\]([\s\S]*?)\[\/ACTION_MENU\]/);
    const menuContent = menuMatch?.[1] || '';
    const hasCancel = /avbestill|kanseller|cancel/i.test(menuContent);
    if (hasCancel) return reply;
    const fullMenu = `[ACTION_MENU]\nEndre tidspunkt\nEndre adresse\nEndre bil\nLegg til tjenester\nAvbestille bestilling\n[/ACTION_MENU]`;
    return reply.replace(/\[ACTION_MENU\][\s\S]*?\[\/ACTION_MENU\]/, fullMenu);
  }
  if (!reply.includes('[BOOKING_INFO]')) return reply;
  if (reply.includes('[BOOKING_CONFIRMED]')) return reply;
  const activeFlowMarkers = ['[TIME_SLOT]', '[BOOKING_EDIT]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[SERVICE_SELECT]', '[BOOKING_SUMMARY]'];
  if (activeFlowMarkers.some(m => reply.includes(m))) return reply;
  
  let hasBooking = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'tool') {
      try {
        const r = JSON.parse(messages[i].content);
        if (r.bookings?.[0] || r.booking || (r.id && r.scheduledAt)) {
          hasBooking = true; break;
        }
      } catch {}
    }
  }
  if (!hasBooking) return reply;
  
  let cleaned = reply;
  cleaned = cleaned.replace(/\[YES_NO\].*?\[\/YES_NO\]/gs, '');
  cleaned = cleaned.replace(/\[ACTION_MENU\](?![\s\S]*?\[\/ACTION_MENU\])/g, '');
  cleaned = cleaned.replace(/^.*(?:Vil du endre|Hva ønsker du|What would you like|What do you want to change|Vil du gjøre endringer|Hva vil du).*$/gim, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  const menu = `\n\n[ACTION_MENU]\nEndre tidspunkt\nEndre adresse\nEndre bil\nLegg til tjenester\nAvbestille bestilling\n[/ACTION_MENU]`;
  cleaned += menu;
  
  console.log('[patchActionMenu] Injected [ACTION_MENU] after [BOOKING_INFO]');
  return cleaned;
}

export function patchGroupSelect(reply: string, messages: any[]): string {
  if (reply.includes('[GROUP_SELECT]')) return reply;
  
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant') break;
    if (msg.role === 'tool') {
      try {
        const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
        if (parsed.needs_group_selection && parsed.user_groups) {
          const customerName = parsed.customer?.name || '';
          const payload = JSON.stringify({ groups: parsed.user_groups });
          const greeting = customerName 
            ? `Hei, ${customerName}! Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?`
            : `Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?`;
          console.log('[patchGroupSelect] Replacing reply with group select prompt for', parsed.user_groups.length, 'groups');
          return `${greeting}\n[GROUP_SELECT]${payload}[/GROUP_SELECT]`;
        }
      } catch { /* ignore */ }
    }
  }
  return reply;
}

export function patchBookingConfirmed(reply: string, messages: any[]): string {
  const marker = '[BOOKING_CONFIRMED]';
  const closingMarker = '[/BOOKING_CONFIRMED]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const jsonStr = reply.slice(startIdx + marker.length, endIdx);
    let data: any;
    try { data = JSON.parse(jsonStr); } catch { return reply; }

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const toolResult = JSON.parse(msg.content);
          
          if (toolResult.booking) {
            const b = toolResult.booking;
            if (!data.booking_id && b.id) data.booking_id = b.id;
            if (!data.booking_number && b.reference) data.booking_number = b.reference;
            if (!data.address && b.address) {
              if (typeof b.address === 'string') data.address = b.address;
              else if (b.address && typeof b.address === 'object') {
                const sn = b.address.street_name || '';
                const num = b.address.street_number || '';
                const zip = b.address.zip_code || '';
                const city = b.address.city || '';
                data.address = `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
              }
            }
            if (!data.car && b.car && typeof b.car === 'object') {
              const plate = extractPlateString(b.car.license_plate_number || b.car.license_plate || b.car.registration);
              data.car = `${b.car.make || ''} ${b.car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
            }
            if (!data.car && b.cars?.[0]) {
              const c = b.cars[0];
              const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
              data.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
            }
          }
          
          const booking = toolResult.bookings?.[0];
          if (booking) {
            if (!data.booking_id && booking.id) data.booking_id = booking.id;
            if (!data.booking_number && booking.reference) data.booking_number = booking.reference;
            if (!data.address && booking.address) {
              data.address = typeof booking.address === 'string' ? booking.address
                : (booking.address.full_address || booking.address.address || null);
            }
            if (!data.car && booking.vehicle) data.car = booking.vehicle;
            if (!data.date && booking.scheduledAt) data.date = (booking.scheduledAt.split(',')[0] || booking.scheduledAt).trim();
            if (!data.time && booking.timeSlot) data.time = booking.timeSlot;
            if (!data.service && booking.services?.[0]) {
              data.service = typeof booking.services[0] === 'string' ? booking.services[0] : (booking.services[0].name || null);
            }
          }
          
          if (!data.booking_id && (toolResult.booking_id || (toolResult.id && !toolResult.scheduledAt))) {
            data.booking_id = toolResult.booking_id || toolResult.id;
            if (!data.booking_number && (toolResult.booking_number || toolResult.reference)) {
              data.booking_number = toolResult.booking_number || toolResult.reference;
            }
          }
        } catch { /* not JSON */ }
      }
    }

    const patched = reply.slice(0, startIdx) + marker + JSON.stringify(data) + reply.slice(endIdx);
    console.log('[patchBookingConfirmed] Overrode booking confirmed data with real values');
    return patched;
  }
  
  let hasUpdateResult = false;
  const data: any = {};
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'tool') continue;
    try {
      const r = JSON.parse(msg.content);
      if (r.booking && (r.booking.id || r.booking.reference)) {
        hasUpdateResult = true;
        const b = r.booking;
        if (!data.booking_id && b.id) data.booking_id = b.id;
        if (!data.booking_number && b.reference) data.booking_number = b.reference;
        if (!data.address && b.address) {
          if (typeof b.address === 'string') data.address = b.address;
          else if (b.address && typeof b.address === 'object') {
            const sn = b.address.street_name || '';
            const num = b.address.street_number || '';
            const zip = b.address.zip_code || '';
            const city = b.address.city || '';
            data.address = `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
          }
        }
        if (!data.car && b.car && typeof b.car === 'object') {
          const plate = extractPlateString(b.car.license_plate_number || b.car.license_plate || b.car.registration);
          data.car = `${b.car.make || ''} ${b.car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
        if (!data.car && b.cars?.[0]) {
          const c = b.cars[0];
          const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
          data.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
        if (!data.car && Array.isArray(b.booking_items_car) && b.booking_items_car[0]?.car) {
          const bic = b.booking_items_car[0].car;
          const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
          data.car = `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
        if (!data.service && Array.isArray(b.service_categories) && b.service_categories[0]?.name) {
          data.service = b.service_categories[0].name;
        }
        if (!data.service && Array.isArray(b.booking_items_car)) {
          for (const bic of b.booking_items_car) {
            if (Array.isArray(bic.sales_items) && bic.sales_items[0]?.name) {
              data.service = bic.sales_items[0].name;
              break;
            }
          }
        }
        if (!data.time && b.delivery_window_starts_at && b.delivery_window_ends_at) {
          try {
            const s = new Date(b.delivery_window_starts_at);
            const e = new Date(b.delivery_window_ends_at);
            data.time = `${s.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}–${e.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}`;
            if (!data.date) data.date = s.toLocaleDateString('nb-NO', {day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'});
          } catch {}
        }
      }
      const booking = r.bookings?.[0];
      if (booking) {
        if (!data.booking_id && booking.id) data.booking_id = booking.id;
        if (!data.booking_number && booking.reference) data.booking_number = booking.reference;
        if (!data.address && booking.address) {
          data.address = typeof booking.address === 'string' ? booking.address : null;
        }
        if (!data.car && booking.vehicle) data.car = booking.vehicle;
        if (!data.date && booking.scheduledAt) data.date = (booking.scheduledAt.split(',')[0] || booking.scheduledAt).trim();
        if (!data.time && booking.timeSlot) data.time = booking.timeSlot;
        if (!data.service && booking.services?.[0]) {
          data.service = typeof booking.services[0] === 'string' ? booking.services[0] : (booking.services[0].name || null);
        }
      }
    } catch {}
  }
  
  if (hasUpdateResult && Object.keys(data).length > 0) {
    console.log('[patchBookingConfirmed] CONTEXT-BASED: update_booking detected, injecting [BOOKING_CONFIRMED]');
    let cleaned = reply;
    cleaned = cleaned.replace(/^.*(?:oppdatert|updated|endret|changed|bekreftet|confirmed).*$/gim, '');
    cleaned = cleaned.replace(/^.*(?:Bestilling|Booking)\s*(?:ID|nummer|#).*$/gim, '');
    cleaned = cleaned.replace(/^.*(?:nye? tid|new time|ny dato|new date).*$/gim, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return `${marker}${JSON.stringify(data)}${closingMarker}\n\n${cleaned || ''}`.trim();
  }
  
  return reply;
}

export function patchTimeSlotConfirmToEdit(reply: string, messages: any[]): string {
  if (reply.includes('[BOOKING_EDIT]')) return reply;
  if (reply.includes('[TIME_SLOT]')) return reply;

  let timeSlotSelection: any = null;
  let bookingData: any = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && !timeSlotSelection) {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.delivery_window_id) {
          timeSlotSelection = parsed;
        }
      } catch {}
      if (!timeSlotSelection) break;
    }
    if (msg.role === 'tool' && !bookingData) {
      try {
        const r = JSON.parse(msg.content);
        if (r.bookings?.[0]) bookingData = r.bookings[0];
        else if (r.booking) bookingData = r.booking;
      } catch {}
    }
  }

  if (!timeSlotSelection || !bookingData) return reply;

  const fmtOslo = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' }); }
    catch { return iso; }
  };
  const fmtDateOslo = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo' }); }
    catch { return iso; }
  };

  const newTime = timeSlotSelection.start_time && timeSlotSelection.end_time
    ? `${fmtOslo(timeSlotSelection.start_time)}\u2013${fmtOslo(timeSlotSelection.end_time)}`
    : '';
  const newDate = timeSlotSelection.start_time ? fmtDateOslo(timeSlotSelection.start_time) : '';

  const editData = {
    booking_id: bookingData.id,
    changes: {
      time: newTime,
      old_time: bookingData.timeSlot || '',
      date: newDate,
      old_date: bookingData.scheduledAt ? (bookingData.scheduledAt.split(',')[0] || '').trim() : '',
      delivery_window_id: timeSlotSelection.delivery_window_id,
      delivery_window_start: timeSlotSelection.start_time,
      delivery_window_end: timeSlotSelection.end_time,
    }
  };

  console.log('[patchTimeSlotConfirmToEdit] Auto-injecting BOOKING_EDIT from time slot selection');
  return `[BOOKING_EDIT]${JSON.stringify(editData)}[/BOOKING_EDIT]`;
}

export async function patchBookingEdit(reply: string, messages: any[], visitorPhone?: string, visitorEmail?: string): Promise<string> {
  const marker = '[BOOKING_EDIT]';
  const closingMarker = '[/BOOKING_EDIT]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  if (startIdx === -1 || endIdx === -1) return reply;

  const jsonStr = reply.slice(startIdx + marker.length, endIdx);
  let editData: any;
  try { editData = JSON.parse(jsonStr); } catch { return reply; }

  let realBookingId: number | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const toolResult = JSON.parse(msg.content);
        if (toolResult.booking?.id) {
          realBookingId = toolResult.booking.id;
          break;
        }
        if (toolResult.bookings?.length > 0) {
          realBookingId = toolResult.bookings[0].id;
          break;
        }
      } catch { /* not JSON */ }
    }
  }

  if (!realBookingId) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const toolResult = JSON.parse(msg.content);
          if (toolResult.bookings?.length > 0) {
            realBookingId = toolResult.bookings[0].id;
            console.log('[patchBookingEdit] Found booking_id from cached context:', realBookingId);
            break;
          }
        } catch {}
      }
    }
    if (!realBookingId) {
      const phone = visitorPhone || '';
      const email = visitorEmail || '';
      if (phone || email) {
        try {
          const lookupResult = JSON.parse(await executeLookupCustomer(phone, email));
          if (lookupResult.bookings?.length > 0) {
            realBookingId = lookupResult.bookings[0].id;
            console.log('[patchBookingEdit] Fresh lookup found booking_id:', realBookingId);
          }
        } catch (e) { console.error('[patchBookingEdit] Fresh lookup failed:', e); }
      }
    }
  }

  if (realBookingId) {
    console.log('[patchBookingEdit] Setting booking_id to:', realBookingId, '(was:', editData.booking_id, ')');
    editData.booking_id = realBookingId;
  }

  const changes = editData.changes || {};

  if (changes.delivery_window_id && (!changes.delivery_window_start || !changes.delivery_window_end)) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'user' || typeof msg.content !== 'string') continue;
      try {
        const sel = JSON.parse(msg.content);
        if (sel.delivery_window_id == changes.delivery_window_id && sel.start_time && sel.end_time) {
          changes.delivery_window_start = sel.start_time;
          changes.delivery_window_end = sel.end_time;
          console.log('[patchBookingEdit] Injected start/end from conversation:', sel.start_time, sel.end_time);
          break;
        }
      } catch { /* not JSON */ }
    }
  }

  const fmtOslo = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' });
  };
  const fmtDateOslo = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo' });
  };

  if (changes.delivery_window_start && changes.delivery_window_end) {
    changes.time = `${fmtOslo(changes.delivery_window_start)}\u2013${fmtOslo(changes.delivery_window_end)}`;
    if (!changes.date) {
      changes.date = fmtDateOslo(changes.delivery_window_start);
    }
  }

  if (changes.date && !changes.old_date) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const toolResult = JSON.parse(msg.content);
          const booking = toolResult.booking || toolResult;
          const oldStart = booking.delivery_window_starts_at || booking.start_time || booking.delivery_window?.starts_at;
          if (oldStart) {
            changes.old_date = fmtDateOslo(oldStart);
            console.log('[patchBookingEdit] Injected old_date:', changes.old_date);
            break;
          }
        } catch { /* not JSON */ }
      }
    }
  }

  editData.changes = changes;
  const patched = reply.slice(0, startIdx) + marker + JSON.stringify(editData) + closingMarker + reply.slice(endIdx + closingMarker.length);
  return patched;
}

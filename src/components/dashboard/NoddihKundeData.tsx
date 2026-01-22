import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  User, 
  Mail, 
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Archive,
  RotateCcw,
  Truck,
  Package,
  Users,
  Droplets,
  Target,
  Gauge,
  Zap
} from 'lucide-react';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { Skeleton } from '@/components/ui/skeleton';

interface Customer {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
}

interface NoddihKundeDataProps {
  customer: Customer | null;
}

export const NoddihKundeData: React.FC<NoddihKundeDataProps> = ({ customer }) => {
  const [emailInput, setEmailInput] = useState('');
  const { 
    data, 
    isLoading, 
    error, 
    isError, 
    hasEmail, 
    hasPhoneOnly, 
    isAuthenticated,
    refresh, 
    isRefreshing 
  } = useNoddihKundeData(customer);

  // Handle email input for phone-only customers
  const handleEmailSubmit = () => {
    if (emailInput && customer) {
      // This would trigger a new lookup with the entered email
      // For now, we'll show a message
      console.log('Would lookup with email:', emailInput);
    }
  };

  if (!customer) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Noddi Customer Data
        </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No customer selected</p>
        </CardContent>
      </Card>
    );
  }


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Noddi Customer Data
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (isError || (data?.error && !data?.notFound)) {
    const errorMessage = data?.rateLimited 
      ? 'Rate limited by Noddi API. Please try again later.' 
        : data?.error === 'Email and organization ID are required'
        ? 'Missing required information for Noddi lookup'
        : data?.error === 'Noddi API token not configured'
          ? 'Noddi integration not configured'
          : error?.message || data?.error || 'Failed to load Noddi data';
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Noddi Customer Data
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (data?.notFound || !data?.data?.found) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Noddi Customer Data
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Customer not found in Noddi system
              {customer.email && ` (${customer.email})`}
              {!customer.email && customer.phone && ` (${customer.phone})`}
            </AlertDescription>
          </Alert>
          
          {hasPhoneOnly && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Try searching with email:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter customer email..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  type="email"
                />
                <Button onClick={handleEmailSubmit} disabled={!emailInput}>
                  Search
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Noddi Customer Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!isAuthenticated 
                ? 'Authentication required to access Noddi data'
                : 'No customer data available'
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Use ONLY ui_meta data for rendering - no fallbacks to old structure
  const payload = data;
  const src = payload?.source; // "cache" | "live"
  const meta = payload?.data?.ui_meta;
  const version = meta?.version || "1.0";
  
  // Version parsing with better numeric safety
  const verNum = (v?: string) => {
    const m = /noddi-edge-(\d+)\.(\d+)/.exec(v ?? "");
    return m ? Number(`${m[1]}.${m[2]}`) : 0;
  };
  const showV13 = verNum(version) >= 1.3;
  const showV14 = verNum(version) >= 1.4;
  const showV15 = verNum(version) >= 1.5;
  const showV16 = verNum(version) >= 1.6;
  const tags: string[] = Array.isArray(meta?.order_tags) ? meta.order_tags : [];
  
  const name = meta?.display_name || "Unknown Customer";
  const groupId = meta?.user_group_badge ?? null;
  const statusLabelText = meta?.status_label || null;
  const iso = meta?.booking_date_iso || null;
  const timezone = meta?.timezone || "Europe/Oslo";

  // Currency formatter
  const moneyFmt = (amt: number, cur: string) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amt);

  const when = (() => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : new Intl.DateTimeFormat(undefined, {
          year: "numeric", month: "short", day: "2-digit",
          hour: "2-digit", minute: "2-digit", timeZone: timezone
        }).format(d);
  })();

  const matchMode = meta?.match_mode || "email";
  const conflict = meta?.conflict || false;
  const unpaidCount = meta?.unpaid_count || 0;
  
  // Enhanced fields (version gated)
  const urls = showV13 ? (meta?.partner_urls) : undefined;
  const order = meta?.order_summary;
  const vehicleLabel = showV13 ? meta?.vehicle_label : null;
  const serviceTitle = showV13 ? meta?.service_title : null;
  
  // Order summary logic - only show when real lines exist
  const hasLines = !!(order && Array.isArray(order.lines) && order.lines.length > 0);
  
  // Type-safe access to urls
  const customerUrl = urls?.customer_url || null;
  const bookingUrl = urls?.booking_url || null;
  const bookingId = urls?.booking_id || null;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Noddi Customer Data
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          {name}
          {groupId != null && (
            <span className="rounded-full border px-2 py-0.5 text-xs">
              ID: {groupId}
            </span>
          )}
          {src === "cache" && (
            <span className="text-xs text-muted-foreground">Cached</span>
          )}
        </h3>

        {/* Quick links - only show for v1.3+ */}
        {showV13 && (customerUrl || bookingUrl) && (
          <div className="mt-2 flex items-center gap-2">
            {customerUrl && (
              <a 
                href={customerUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs underline hover:no-underline flex items-center gap-1"
              >
                Open Customer
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {bookingUrl && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <a 
                  href={bookingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs underline hover:no-underline flex items-center gap-1"
                >
                  Open Booking{bookingId ? ` #${bookingId}` : ""}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2 py-0.5">
            Matched by {matchMode === "phone" ? "Phone" : "Email"}
          </span>
          {conflict && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800">
              Conflict
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{customer.email}</span>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Last Booking</div>
            <div className="flex flex-wrap gap-2">
              {statusLabelText && (
                <span className="rounded-full border px-2 py-0.5 text-xs">{statusLabelText}</span>
              )}
              {/* Unable to complete chip */}
              {showV16 && meta?.unable_to_complete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-900 text-xs">
                  {meta?.unable_label ?? 'Unable to complete'}
                </span>
              )}
              {/* Paid/unpaid status chip */}
              {showV16 && meta?.money?.paid_state && (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                  meta.money.paid_state === 'paid' 
                    ? 'bg-green-100 text-green-900' 
                    : meta.money.paid_state === 'partially_paid' 
                    ? 'bg-yellow-100 text-yellow-900' 
                    : meta.money.paid_state === 'unpaid' 
                    ? 'bg-red-100 text-red-900' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {meta.money.paid_state === 'paid' ? 'Paid' :
                   meta.money.paid_state === 'partially_paid' ? 'Partially paid' :
                   meta.money.paid_state === 'unpaid' ? 'Unpaid' : 'Payment'}
                </span>
              )}
            </div>
          </div>
          <div className="text-base">{when}</div>
        </div>

        {/* Service & vehicle section - only show for v1.3+ */}
        {showV13 && (serviceTitle || vehicleLabel) && (
          <div className="mt-4 rounded-xl border p-3">
            <div className="text-sm font-medium">Service</div>
            <div className="mt-1 text-sm">
              {serviceTitle || "N/A"}{vehicleLabel ? ` — ${vehicleLabel}` : ""}
            </div>
          </div>
        )}

        {/* Service tags - only show if available and v1.5+ */}
        {showV15 && tags.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Service Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => {
                const getServiceTagStyle = (tag: string) => {
                  const tagLower = tag.toLowerCase();
                  if (tagLower.includes('dekkhotell')) return { bg: 'bg-blue-100', text: 'text-blue-900', icon: Archive };
                  if (tagLower.includes('dekkskift')) return { bg: 'bg-green-100', text: 'text-green-900', icon: RotateCcw };
                  if (tagLower.includes('hjemlevering')) return { bg: 'bg-purple-100', text: 'text-purple-900', icon: Truck };
                  if (tagLower.includes('henting') || tagLower.includes('levering')) return { bg: 'bg-orange-100', text: 'text-orange-900', icon: Package };
                  if (tagLower.includes('bærehjelp')) return { bg: 'bg-teal-100', text: 'text-teal-900', icon: Users };
                  if (tagLower.includes('felgvask')) return { bg: 'bg-indigo-100', text: 'text-indigo-900', icon: Droplets };
                  if (tagLower.includes('balansering')) return { bg: 'bg-pink-100', text: 'text-pink-900', icon: Target };
                  if (tagLower.includes('tpms') || tagLower.includes('ventil')) return { bg: 'bg-red-100', text: 'text-red-900', icon: Gauge };
                  if (tagLower.includes('punktering')) return { bg: 'bg-yellow-100', text: 'text-yellow-900', icon: Zap };
                  return { bg: 'bg-muted', text: 'text-muted-foreground', icon: null };
                };
                
                const style = getServiceTagStyle(t);
                const IconComponent = style.icon;
                
                return (
                  <span key={t} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${style.bg} ${style.text}`}>
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    {t}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Summary v1.6 */}
        {(() => {
          const lines = Array.isArray(meta?.order_lines) ? meta.order_lines : [];
          const mny = meta?.money;
          const showOrder = showV16 && ((lines.length > 0) || (mny && (mny.gross || mny.vat || mny.net)));
          
          return showOrder && (
            <div className="mt-4 rounded-lg border p-3">
              <div className="font-medium mb-2">Order Summary</div>

              {lines.length > 0 && (
                <div className="space-y-1 mb-2">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="truncate">
                        {l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ''}
                      </div>
                      <div className={`${l.is_discount ? 'text-red-600' : ''} ${meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}`}>
                        {moneyFmt(l.amount_gross, l.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mny && (
                <div className="border-t pt-2 text-sm">
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span className={meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>{moneyFmt(mny.vat, mny.currency)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className={meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>{moneyFmt(mny.gross, mny.currency)}</span>
                  </div>

                  {mny.outstanding > 0 && (
                    <div className="mt-1 flex justify-between text-rose-700">
                      <span>Outstanding</span>
                      <span className={meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>{moneyFmt(mny.outstanding, mny.currency)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}


        {unpaidCount > 0 && (
          <>
            <Separator />
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {unpaidCount} unpaid booking(s) need attention
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};
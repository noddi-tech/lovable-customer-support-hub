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
  ExternalLink
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

  if (hasPhoneOnly) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Noddi Customer Data
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Noddi data (needs email). Customer has phone: {customer.phone}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Enter email to search Noddi:</p>
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
        </CardContent>
      </Card>
    );
  }

  if (!hasEmail) {
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
                : 'No email or phone available for this customer'
              }
            </AlertDescription>
          </Alert>
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
        : data?.error === 'Noddi API key not configured'
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

  if (data?.notFound) {
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
              Customer not found in Noddi system ({customer.email})
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Use ONLY ui_meta data for rendering - no fallbacks to old structure
  const payload = data;
  const src = payload?.source; // "cache" | "live"
  const meta = payload?.data?.ui_meta;
  const version = meta?.version || "1.0";
  const isNewVersion = version >= "noddi-edge-1.3";
  
  const name = meta?.display_name || "Unknown Customer";
  const groupId = meta?.user_group_badge ?? null;
  const statusLabelText = meta?.status_label || null;
  const iso = meta?.booking_date_iso || null;
  const timezone = meta?.timezone || "Europe/Oslo";

  // Currency formatter
  const money = (amt: number, cur: string) =>
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
  
  // New enhanced fields (version gated)
  const urls = isNewVersion ? (meta?.partner_urls) : undefined;
  const order = isNewVersion ? (meta?.order_summary ?? null) : null;
  const vehicleLabel = isNewVersion ? meta?.vehicle_label : null;
  const serviceTitle = isNewVersion ? meta?.service_title : null;
  
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

        {/* Quick links - only show for new version */}
        {isNewVersion && (customerUrl || bookingUrl) && (
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Last Booking</div>
            {statusLabelText && (
              <span className="rounded-full border px-2 py-0.5 text-xs">{statusLabelText}</span>
            )}
          </div>
          <div className="mt-1 text-base">{when}</div>
        </div>

        {/* Service & vehicle section - only show for new version */}
        {isNewVersion && (serviceTitle || vehicleLabel) && (
          <div className="mt-4 rounded-xl border p-3">
            <div className="text-sm font-medium">Service</div>
            <div className="mt-1 text-sm">
              {serviceTitle || "N/A"}{vehicleLabel ? ` — ${vehicleLabel}` : ""}
            </div>
          </div>
        )}

        {/* Order summary - only show for new version */}
        {isNewVersion && order && (
          <div className="mt-4 rounded-xl border p-3">
            <div className="text-sm font-medium">Order Summary</div>
            <div className="mt-2 space-y-1">
              {(order.lines ?? []).map((l: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="truncate">
                    {l.name}
                    {l.quantity > 1 && <span className="text-muted-foreground"> × {l.quantity}</span>}
                  </div>
                  <div className={l.kind === "discount" ? "text-red-600" : ""}>
                    {money(l.subtotal || l.unit_amount * l.quantity || 0, order.currency)}
                  </div>
                </div>
              ))}
              {"vat" in order && (
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">VAT</div>
                  <div>{money(order.vat || 0, order.currency)}</div>
                </div>
              )}
              <div className="mt-1 border-t pt-2 flex items-center justify-between text-sm font-medium">
                <div>Total</div>
                <div>{money(order.total || 0, order.currency)}</div>
              </div>
            </div>
          </div>
        )}

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
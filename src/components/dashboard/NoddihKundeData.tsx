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
  AlertCircle
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
  const name = meta?.display_name || "Unknown Customer";
  const groupId = meta?.user_group_badge ?? null;
  const statusLabelText = meta?.status_label || null;
  const iso = meta?.booking_date_iso || null;

  const when = (() => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : new Intl.DateTimeFormat(undefined, {
          year: "numeric", month: "short", day: "2-digit",
          hour: "2-digit", minute: "2-digit"
        }).format(d);
  })();

  const matchMode = meta?.match_mode || "email";
  const conflict = meta?.conflict || false;
  const unpaidCount = meta?.unpaid_count || 0;
  
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
        <h3 className="text-lg font-semibold">
          {name}
          {groupId != null && (
            <span className="ml-2 rounded-full border px-2 py-0.5 text-xs">
              ID: {groupId}
            </span>
          )}
          {src === "cache" && (
            <span className="ml-2 text-xs text-muted-foreground">Cached</span>
          )}
          <span className="ml-2 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            Matched by {matchMode === "phone" ? "Phone" : "Email"}
          </span>
          {conflict && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
              Conflict
            </span>
          )}
        </h3>

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
          <div className="mt-2 text-base">{when}</div>
        </div>

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
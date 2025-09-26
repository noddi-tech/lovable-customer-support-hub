import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  CreditCard,
  MapPin,
  Truck,
  AlertCircle
} from 'lucide-react';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { Skeleton } from '@/components/ui/skeleton';
import type { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'scheduled':
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract unified response data - handle both new and legacy formats
  const isNewFormat = data && typeof data === 'object' && 'ok' in data && 'source' in data && 'data' in data;
  
  if (isNewFormat) {
    const unifiedData = data as NoddiLookupResponse;
    const { ui_meta } = unifiedData.data;
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            {ui_meta.display_name}
            {ui_meta.user_group_badge != null && (
              <Badge variant="outline" className="text-xs">
                ID: {ui_meta.user_group_badge}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unifiedData.source === "cache" && (
              <Badge variant="secondary" className="text-xs">
                Cached
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Customer Profile */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{ui_meta.display_name}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{unifiedData.data.email}</span>
              </div>
              
              {unifiedData.data.user?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{unifiedData.data.user.phone}</span>
                  {unifiedData.data.user.phoneVerified && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                </div>
              )}
              
              {unifiedData.data.user?.language && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Language:</span>
                  <Badge variant="secondary">{unifiedData.data.user.language}</Badge>
                </div>
              )}
              
              {unifiedData.data.user?.registrationDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Registered: {new Date(unifiedData.data.user.registrationDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Priority Booking */}
          {unifiedData.data.priority_booking ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {unifiedData.data.priority_booking_type === 'upcoming' ? 'Next Booking' : 'Last Booking'}
                </h4>
                <Badge className={getStatusColor(unifiedData.data.priority_booking.status?.label || 'unknown')}>
                  {unifiedData.data.priority_booking.status?.label || 'Unknown'}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {unifiedData.data.priority_booking_type === 'upcoming' 
                      ? new Date(unifiedData.data.priority_booking.deliveryWindowStartsAt || '').toLocaleDateString()
                      : new Date(unifiedData.data.priority_booking.completedAt || unifiedData.data.priority_booking.deliveryWindowStartsAt || '').toLocaleDateString()
                    }
                  </span>
                </div>
                
                {unifiedData.data.priority_booking.totalAmount && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Amount: {unifiedData.data.priority_booking.totalAmount} NOK</span>
                  </div>
                )}
                
                {unifiedData.data.priority_booking.services?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>{unifiedData.data.priority_booking.services.length} service(s)</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>No bookings found for this customer</AlertDescription>
            </Alert>
          )}

          {/* Unpaid Bookings Alert - use ui_meta only */}
          {ui_meta.unpaid_count > 0 && (
            <>
              <Separator />
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Financial Action Required</div>
                  <div className="mt-1">
                    {ui_meta.unpaid_count} unpaid/pending booking(s) need attention
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Cache TTL: {unifiedData.ttl_seconds}s remaining
          </div>
        </CardContent>
      </Card>
    );
  }

  // Legacy format support (will be removed after migration)
  const legacyData = data as any;
  const meta = legacyData?.ui_meta;
  const displayName = meta?.display_name || "Unknown Customer";
  const userGroupId = meta?.user_group_badge ?? null;
  const unpaidCount = Number(meta?.unpaid_count ?? 0);
  const isCached = (legacyData?.cached === true) || (meta?.source === "cache");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          {displayName}
          {userGroupId != null && (
            <Badge variant="outline" className="text-xs">
              ID: {userGroupId}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {isCached && (
            <Badge variant="secondary" className="text-xs">
              Cached
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Profile */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{displayName}</span>
          </div>
          
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
              
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Noddi User ID:</span>
                <Badge variant="secondary">{userGroupId || 'N/A'}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Last checked: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
        </div>

        <Separator />

        {/* Legacy Booking Info - Limited Data Available */}
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>Booking data available after system upgrade</AlertDescription>
        </Alert>

        {/* Pending/Unpaid Bookings Alert */}
        {unpaidCount > 0 && (
          <>
            <Separator />
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Financial Action Required</div>
                <div className="mt-1">
                  {unpaidCount} unpaid/pending booking(s) need attention
                </div>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Legacy Cache Info */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Legacy format - upgrade pending
        </div>
      </CardContent>
    </Card>
  );
};
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
import { format } from 'date-fns';

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

  const { customer: noddihCustomer, priorityBooking, priorityBookingType, pendingBookings } = data;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: any) => {
    console.log('getStatusColor called with:', status, 'type:', typeof status);
    
    let statusString: string;
    
    if (!status) {
      return 'bg-gray-100 text-gray-800';
    }
    
    if (typeof status === 'string') {
      statusString = status;
    } else if (typeof status === 'object' && status !== null) {
      const extracted = status.value || status.label || 'unknown';
      statusString = String(extracted);
      console.log('Extracted from object:', extracted, 'converted to:', statusString);
    } else {
      statusString = String(status);
      console.log('Converted non-object to string:', statusString);
    }
    
    switch (statusString.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Noddi Customer Data
        </CardTitle>
        <div className="flex items-center gap-2">
          {data.cached && (
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
            <span className="font-medium">
              {noddihCustomer.firstName || noddihCustomer.lastName 
                ? `${noddihCustomer.firstName || ''} ${noddihCustomer.lastName || ''}`.trim()
                : 'Unknown Name'}
            </span>
            <Badge variant="outline" className="text-xs">
              ID: {noddihCustomer.noddiUserId}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{noddihCustomer.email}</span>
            </div>
            
            {noddihCustomer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{noddihCustomer.phone}</span>
                {noddihCustomer.phoneVerified && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
            )}
            
            {noddihCustomer.language && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Language:</span>
                <Badge variant="secondary">
                  {(() => {
                    console.log('Language field:', noddihCustomer.language, 'type:', typeof noddihCustomer.language);
                    if (typeof noddihCustomer.language === 'string') {
                      return noddihCustomer.language;
                    } else if (typeof noddihCustomer.language === 'object' && noddihCustomer.language !== null) {
                      const extracted = (noddihCustomer.language as any).value || (noddihCustomer.language as any).label || 'Unknown';
                      return String(extracted);
                    } else {
                      return String(noddihCustomer.language || 'Unknown');
                    }
                  })()}
                </Badge>
              </div>
            )}
            
            {noddihCustomer.registrationDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Registered: {formatDate(noddihCustomer.registrationDate)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Priority Booking */}
        {priorityBooking ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                {priorityBookingType === 'upcoming' ? 'Next Booking' : 'Last Booking'}
              </h4>
              <Badge className={getStatusColor(priorityBooking.status)}>
                {(() => {
                  console.log('Priority booking status:', priorityBooking.status, 'type:', typeof priorityBooking.status);
                  if (typeof priorityBooking.status === 'string') {
                    return priorityBooking.status;
                  } else if (typeof priorityBooking.status === 'object' && priorityBooking.status !== null) {
                    const extracted = (priorityBooking.status as any).value || (priorityBooking.status as any).label || 'Unknown';
                    return String(extracted);
                  } else {
                    return String(priorityBooking.status || 'Unknown');
                  }
                })()}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {priorityBookingType === 'upcoming' 
                    ? formatDate(priorityBooking.deliveryWindowStartsAt)
                    : formatDate(priorityBooking.completedAt || priorityBooking.deliveryWindowStartsAt)}
                </span>
              </div>
              
              {priorityBooking.totalAmount && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>Amount: {priorityBooking.totalAmount} NOK</span>
                </div>
              )}
              
              {priorityBooking.services && priorityBooking.services.length > 0 && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>{priorityBooking.services.length} service(s)</span>
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

        {/* Pending/Unpaid Bookings Alert */}
        {pendingBookings.length > 0 && (
          <>
            <Separator />
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Financial Action Required</div>
                <div className="mt-1">
                  {pendingBookings.length} unpaid/pending booking(s) need attention
                </div>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last updated: {formatDate(data.lastRefreshed)}
        </div>
      </CardContent>
    </Card>
  );
};
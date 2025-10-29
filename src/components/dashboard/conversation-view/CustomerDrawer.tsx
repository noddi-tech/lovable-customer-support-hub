import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Car,
  Package,
  ExternalLink,
  ChevronRight,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerDrawerProps {
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  className?: string;
}

export const CustomerDrawer = ({ customer, className }: CustomerDrawerProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!customer) {
    return (
      <div className={cn("border-l bg-muted/30 p-6", className)}>
        <div className="text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No customer information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border-l bg-background", className)}>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Customer Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{customer.full_name}</h3>
                <p className="text-sm text-muted-foreground">Customer</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-90"
                  )} 
                />
              </Button>
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={`mailto:${customer.email}`}
                  className="text-primary hover:underline"
                >
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${customer.phone}`}
                    className="text-primary hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recent Bookings - Placeholder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Recent Bookings
              </h4>
              <Badge variant="secondary" className="text-xs">0</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>No recent bookings</p>
            </div>
          </div>

          <Separator />

          {/* Vehicles - Placeholder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicles
              </h4>
              <Badge variant="secondary" className="text-xs">0</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>No vehicles registered</p>
            </div>
          </div>

          <Separator />

          {/* Tire Storage - Placeholder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Tire Storage
              </h4>
              <Badge variant="secondary" className="text-xs">0</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>No tires in storage</p>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Actions</h4>
            <div className="grid gap-2">
              <Button variant="outline" size="sm" className="justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Create Booking
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                View Service History
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

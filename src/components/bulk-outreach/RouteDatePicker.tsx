import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Loader2 } from "lucide-react";

interface RouteDatePickerProps {
  onFetchBookings: (date: string) => void;
  isLoading: boolean;
}

export function RouteDatePicker({ onFetchBookings, isLoading }: RouteDatePickerProps) {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  return (
    <div className="space-y-3">
      <Label htmlFor="route-date">Select Date</Label>
      <div className="flex gap-3">
        <Input
          id="route-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => onFetchBookings(date)} disabled={isLoading || !date}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-4 w-4" />
          )}
          Fetch Bookings
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Loads all Noddi bookings for the selected date so you can select affected customers.
      </p>
    </div>
  );
}

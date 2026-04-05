import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Recipient {
  plate: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  matched: boolean;
  selected: boolean;
  reason?: string;
  source?: string;
  booking_date?: string | null;
  booking_time?: string | null;
  booking_service?: string | null;
}

const REASON_LABELS: Record<string, string> = {
  no_car_found: "No car found for this plate",
  car_found_no_contact: "Car found but no contact info in any booking",
  no_user_on_car: "Car found but no linked user",
  no_email_on_booking: "Booking found but no email",
  api_error: "API error during lookup",
};

const SOURCE_LABELS: Record<string, string> = {
  cache: "Local cache",
  car_user: "Car owner",
  car_user_group: "User group",
  booking_by_car_id: "Booking (by car)",
  booking_by_search: "Booking (by search)",
  local_customers: "Local customer DB",
};

interface RecipientReviewProps {
  recipients: Recipient[];
  onToggle: (index: number) => void;
  onToggleAll: (checked: boolean) => void;
}

export function RecipientReview({ recipients, onToggle, onToggleAll }: RecipientReviewProps) {
  const matchedCount = recipients.filter((r) => r.matched).length;
  const selectedCount = recipients.filter((r) => r.selected).length;
  const allSelected = matchedCount > 0 && recipients.filter((r) => r.matched).every((r) => r.selected);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {matchedCount} of {recipients.length} customers matched
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedCount} selected for sending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onToggleAll(!!checked)}
          />
          <span className="text-sm">Select all matched</span>
        </div>
      </div>

      <div className="border rounded-md max-h-[400px] overflow-auto">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Reg. Nr.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r, i) => (
                <TableRow key={r.plate} className={!r.matched ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={r.selected}
                      disabled={!r.matched}
                      onCheckedChange={() => onToggle(i)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.plate}</TableCell>
                  <TableCell>{r.name || "—"}</TableCell>
                  <TableCell className="text-sm">{r.email || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.booking_date ? (
                      <div className="space-y-0.5">
                        <p className="font-medium">{r.booking_date}</p>
                        {r.booking_time && (
                          <p className="text-xs text-muted-foreground">{r.booking_time}</p>
                        )}
                        {r.booking_service && (
                          <p className="text-xs text-muted-foreground">{r.booking_service}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.matched ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="default">Matched</Badge>
                        </TooltipTrigger>
                        {r.source && (
                          <TooltipContent>
                            Source: {SOURCE_LABELS[r.source] || r.source}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="destructive">Not found</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {REASON_LABELS[r.reason || ""] || r.reason || "Could not resolve contact"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
    </div>
  );
}

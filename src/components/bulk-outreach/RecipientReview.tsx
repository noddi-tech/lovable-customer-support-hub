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

export interface Recipient {
  plate: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  matched: boolean;
  selected: boolean;
}

interface RecipientReviewProps {
  recipients: Recipient[];
  onToggle: (index: number) => void;
  onToggleAll: (checked: boolean) => void;
}

export function RecipientReview({ recipients, onToggle, onToggleAll }: RecipientReviewProps) {
  const matchedCount = recipients.filter((r) => r.matched).length;
  const selectedCount = recipients.filter((r) => r.selected).length;
  const allSelected = recipients.filter((r) => r.matched).every((r) => r.selected);

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Reg. Nr.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.map((r, i) => (
              <TableRow key={i} className={!r.matched ? "opacity-50" : ""}>
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
                <TableCell>
                  {r.matched ? (
                    <Badge variant="default">Matched</Badge>
                  ) : (
                    <Badge variant="destructive">Not found</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

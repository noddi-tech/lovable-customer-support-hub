export type PriorityType = "upcoming" | "completed" | null | undefined;

const STATUS_CODE_MAP: Record<number, string> = {
  1: "Draft",
  2: "Pending", 
  3: "Scheduled",
  4: "Completed",
  5: "Cancelled",
  // add/adjust to your enum if needed
};

export function displayName(user?: any, email?: string, priorityBooking?: any): string {
  // Try user.name first
  const direct = user?.name && String(user.name).trim()
    ? String(user.name).trim()
    : null;
  
  if (direct) return direct;

  // Try first_name + last_name (expected structure)
  const fn1 = (user?.first_name || "").trim();
  const ln1 = (user?.last_name || "").trim();
  const fromParts1 = [fn1, ln1].filter(Boolean).join(" ").trim();
  if (fromParts1) return fromParts1;

  // Try firstName + lastName (current structure)  
  const fn2 = (user?.firstName || "").trim();
  const ln2 = (user?.lastName || "").trim();
  const fromParts2 = [fn2, ln2].filter(Boolean).join(" ").trim();
  if (fromParts2) return fromParts2;

  // Try priority booking customer/user name
  const pbName = priorityBooking?.customer?.name || priorityBooking?.user?.name || "";
  if (pbName && String(pbName).trim()) return String(pbName).trim();

  // Fallback to email prefix
  const fallback = (email || "").split("@")[0];
  return fallback || "Unknown Name";
}

export function statusLabel(status: any): string {
  // Prefer label field
  if (status?.label) return String(status.label);

  // Sometimes backend returns `status` as plain string
  if (typeof status === "string") return status;

  // Sometimes we only get a value/number
  const value = status?.value ?? status?.id ?? status;
  if (typeof value === "number") return STATUS_CODE_MAP[value] || `Status ${value}`;
  if (typeof value === "string") return value;

  return "Unknown";
}

export function pick<T = any>(obj: any, ...candidates: string[]): T | undefined {
  for (const key of candidates) {
    if (obj && obj[key] != null) return obj[key];
  }
  return undefined;
}

export function isoFromBooking(booking: any, type: PriorityType): string | undefined {
  // Be generous with accepted date field names
  // Upcoming → prefer window start; Completed → prefer completed_at
  if (type === "upcoming") {
    return (
      pick<string>(booking, "delivery_window_starts_at", "window_starts_at", "date") ??
      pick<string>(booking, "starts_at", "start_at", "scheduled_at")
    );
  }

  if (type === "completed") {
    return (
      pick<string>(booking, "completed_at", "finished_at") ??
      // fallback to latest "date"
      pick<string>(booking, "date", "updated_at", "created_at")
    );
  }

  // If type unknown, pick in a sensible order
  return (
    pick<string>(booking, "delivery_window_starts_at", "window_starts_at", "completed_at", "date") ??
    pick<string>(booking, "updated_at", "created_at")
  );
}

export function formatDate(iso?: string, locale?: string): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      year: "numeric",
      month: "short", 
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}
// Shared table sorting utilities

export function sortByString(a: string | null | undefined, b: string | null | undefined, direction: 'asc' | 'desc' = 'asc'): number {
  const aVal = (a || '').toLowerCase();
  const bVal = (b || '').toLowerCase();
  const result = aVal.localeCompare(bVal);
  return direction === 'asc' ? result : -result;
}

export function sortByDate(a: string | null | undefined, b: string | null | undefined, direction: 'asc' | 'desc' = 'asc'): number {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  const result = aTime - bTime;
  return direction === 'asc' ? result : -result;
}

export function sortByNumber(a: number | null | undefined, b: number | null | undefined, direction: 'asc' | 'desc' = 'asc'): number {
  const aVal = a ?? 0;
  const bVal = b ?? 0;
  const result = aVal - bVal;
  return direction === 'asc' ? result : -result;
}

const statusOrder: Record<string, number> = {
  open: 1,
  in_progress: 2,
  pending_customer: 3,
  awaiting_parts: 4,
  completed: 5,
  cancelled: 6,
};

export function sortByStatus(a: string, b: string, direction: 'asc' | 'desc' = 'asc'): number {
  const aOrder = statusOrder[a] ?? 999;
  const bOrder = statusOrder[b] ?? 999;
  const result = aOrder - bOrder;
  return direction === 'asc' ? result : -result;
}

const priorityOrder: Record<string, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export function sortByPriority(a: string, b: string, direction: 'asc' | 'desc' = 'asc'): number {
  const aOrder = priorityOrder[a] ?? 999;
  const bOrder = priorityOrder[b] ?? 999;
  const result = aOrder - bOrder;
  return direction === 'asc' ? result : -result;
}

// Types mirroring the Noddi backend ticket API (/v1/tickets/).
// The Support Hub owns no ticket data — these are read-through DTOs only.

export const NODDI_TICKET_STATUSES = ['OPEN', 'SNOOZED', 'RESOLVED', 'ARCHIVED'] as const;
export const NODDI_TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const NODDI_TICKET_CATEGORIES = [
  'CUSTOMER_ISSUE',
  'DAMAGE_REPORT',
  'DATA_QUALITY',
  'FOLLOW_UP',
  'INTERNAL',
  'OTHER',
  'PAYMENT',
  'TIRE_HOTEL_ISSUE',
] as const;
export const NODDI_TICKET_TYPES = ['BUG', 'FEATURE', 'INCIDENT', 'OTHER', 'TASK'] as const;

export type NoddiTicketStatus = (typeof NODDI_TICKET_STATUSES)[number];
export type NoddiTicketPriority = (typeof NODDI_TICKET_PRIORITIES)[number];
export type NoddiTicketCategory = (typeof NODDI_TICKET_CATEGORIES)[number];
export type NoddiTicketType = (typeof NODDI_TICKET_TYPES)[number];

export interface NoddiRef {
  id: number;
  name?: string | null;
  slug?: string | null;
}

export interface NoddiTicketTag {
  id: number;
  short_name: string;
  long_name?: string;
  color_hex?: string | null;
  icon?: string | null;
}

export interface NoddiTicket {
  id: number;
  title: string;
  description: string;
  status: NoddiTicketStatus;
  priority: NoddiTicketPriority;
  category: NoddiTicketCategory;
  type: NoddiTicketType;
  created_at: string;
  updated_at?: string | null;
  due_at?: string | null;
  snoozed_until?: string | null;
  resolved_at?: string | null;
  archived_at?: string | null;
  resolution_note?: string;
  assignee?: NoddiRef | null;
  created_by?: { id: number; name?: string; email?: string | null } | null;
  service_department?: { id: number; name: string } | null;
  user_group?: NoddiRef | null;
  user_group_car?: { id: number; license_plate?: unknown; make?: string; model?: string } | null;
  booking?: { id: number; slug?: string } | null;
  tags?: NoddiTicketTag[];
}

export interface NoddiTicketEvent {
  id: number;
  ticket_id: number;
  event_type: string;
  comment: string;
  detail: string;
  reason: string;
  resolution_note: string;
  source: string;
  actor_id: number | null;
  actor_name: string | null;
  created_at: string;
  mentioned_users?: Array<{ id: number; mention_id: number; name: string }>;
}

export interface NoddiPaginated<T> {
  count: number;
  page_index: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface NoddiTicketListParams {
  page_index?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  statuses?: NoddiTicketStatus[];
  priorities?: NoddiTicketPriority[];
  categories?: NoddiTicketCategory[];
  assignee_ids?: number[];
  service_department_ids?: number[];
  user_group_ids?: number[];
  booking_ids?: number[];
  tag_ids?: number[];
  created_at_gte?: string;
  created_at_lte?: string;
}

export const TICKET_STATUS_LABELS: Record<NoddiTicketStatus, string> = {
  OPEN: 'Open',
  SNOOZED: 'Snoozed',
  RESOLVED: 'Resolved',
  ARCHIVED: 'Archived',
};

export const TICKET_PRIORITY_LABELS: Record<NoddiTicketPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const TICKET_CATEGORY_LABELS: Record<NoddiTicketCategory, string> = {
  CUSTOMER_ISSUE: 'Customer issue',
  DAMAGE_REPORT: 'Damage report',
  DATA_QUALITY: 'Data quality',
  FOLLOW_UP: 'Follow up',
  INTERNAL: 'Internal',
  OTHER: 'Other',
  PAYMENT: 'Payment',
  TIRE_HOTEL_ISSUE: 'Tire hotel issue',
};

export const TICKET_TYPE_LABELS: Record<NoddiTicketType, string> = {
  BUG: 'Bug',
  FEATURE: 'Feature',
  INCIDENT: 'Incident',
  OTHER: 'Other',
  TASK: 'Task',
};

// Service Tickets Types

export type ServiceTicketStatus = 
  | 'open'
  | 'acknowledged'
  | 'scheduled'
  | 'in_progress'
  | 'pending_customer'
  | 'awaiting_parts'
  | 'on_hold'
  | 'completed'
  | 'verified'
  | 'closed'
  | 'cancelled';

export type ServiceTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ServiceTicketCategory = 
  | 'tire_issue'
  | 'service_complaint'
  | 'follow_up'
  | 'warranty'
  | 'safety_concern'
  | 'other';

export type ServiceType = 
  | 'on_site_visit'
  | 'workshop_appointment'
  | 'remote_support'
  | 'callback';

export interface ServiceTicket {
  id: string;
  organization_id: string;
  ticket_number: string;
  title: string;
  description: string;
  
  // Customer & Context
  customer_id?: string;
  conversation_id?: string;
  call_id?: string;
  
  // Noddi Integration
  noddi_user_group_id?: number;
  noddi_booking_id?: number;
  noddi_booking_type?: string;
  
  // Status Pipeline
  status: ServiceTicketStatus;
  priority: ServiceTicketPriority;
  category?: ServiceTicketCategory;
  
  // Assignment
  assigned_to_id?: string;
  assigned_team?: string;
  department_id?: string;
  
  // Service Details
  service_type?: ServiceType;
  scheduled_for?: string;
  scheduled_date?: string;
  completed_at?: string;
  
  // SLA Tracking
  due_date?: string;
  first_response_at?: string;
  resolution_time_minutes?: number;
  
  // Financial
  estimated_cost?: number;
  actual_cost?: number;
  currency?: string;
  
  // Metadata
  tags?: string[];
  custom_fields?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Audit
  created_by_id?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  
  // Soft delete
  is_deleted?: boolean;
  
  // Relations (populated by joins)
  customer?: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
  };
  assigned_to?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  };
  created_by?: {
    user_id: string;
    full_name: string;
  };
}

export interface ServiceTicketEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  triggered_by_id?: string;
  triggered_by_source: string;
  noddi_event_type?: string;
  noddi_event_data?: Record<string, any>;
  created_at: string;
  
  // Relations
  triggered_by?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ServiceTicketComment {
  id: string;
  ticket_id: string;
  content: string;
  is_internal: boolean;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  created_by?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ServiceTicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  uploaded_by_id?: string;
  created_at: string;
  
  // Relations
  uploaded_by?: {
    user_id: string;
    full_name: string;
  };
}

export interface CreateServiceTicketRequest {
  title: string;
  description: string;
  customerId?: string;
  priority?: ServiceTicketPriority;
  category?: ServiceTicketCategory;
  conversationId?: string;
  callId?: string;
  noddiBookingId?: number;
  noddiUserGroupId?: number;
  noddiBookingType?: string;
  assignedToId?: string;
  scheduledFor?: string;
  tags?: string[];
  dueDate?: string;
  serviceType?: ServiceType;
}

export interface UpdateTicketStatusRequest {
  ticketId: string;
  newStatus: ServiceTicketStatus;
  comment?: string;
  notifyCustomer?: boolean;
  assignedToId?: string;
  scheduledFor?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  slack_enabled: boolean;
  notify_on_assignment: boolean;
  notify_on_status_change: boolean;
  notify_on_comment: boolean;
  notify_on_overdue: boolean;
  notify_only_high_priority: boolean;
  notify_only_assigned_to_me: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone: string;
  created_at: string;
  updated_at: string;
}

// Status display helpers
export const STATUS_LABELS: Record<ServiceTicketStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  pending_customer: 'Pending Customer',
  awaiting_parts: 'Awaiting Parts',
  on_hold: 'On Hold',
  completed: 'Completed',
  verified: 'Verified',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<ServiceTicketStatus, string> = {
  open: 'bg-blue-500',
  acknowledged: 'bg-cyan-500',
  scheduled: 'bg-purple-500',
  in_progress: 'bg-yellow-500',
  pending_customer: 'bg-amber-500',
  awaiting_parts: 'bg-orange-500',
  on_hold: 'bg-gray-500',
  completed: 'bg-green-500',
  verified: 'bg-emerald-500',
  closed: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

export const PRIORITY_LABELS: Record<ServiceTicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_COLORS: Record<ServiceTicketPriority, string> = {
  low: 'bg-gray-500',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export const CATEGORY_LABELS: Record<ServiceTicketCategory, string> = {
  tire_issue: 'Tire Issue',
  service_complaint: 'Service Complaint',
  follow_up: 'Follow Up',
  warranty: 'Warranty',
  safety_concern: 'Safety Concern',
  other: 'Other',
};

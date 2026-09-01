import {
  Briefcase,
  MessageSquare, 
  Inbox,
  MessageCircle,
  Phone, 
  Megaphone, 
  Mail, 
  Ticket, 
    Users,
  BarChart3,

  User,
  Bell,
  Shield,
  Search,
  Send,
  FileLock2,
  Timer,
  UserRound,
  FunctionSquare
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: any;
  /** Short explanation shown on hover in the sidebar. */
  description?: string;
  group: "notifications" | "support" | "interactions" | "marketing" | "operations" | "settings";
  requiredRole?: "admin" | "super_admin";
  showBadge?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // Search - Global search page
  { 
    id: "search", 
    label: "Search",
    description: "Search across conversations, customers, cases and knowledge in one place.", 
    to: "/search", 
    icon: Search, 
    group: "notifications"
  },
  
  // Notifications - Above interactions
  { 
    id: "notifications", 
    label: "Notifications",
    description: "Your mentions, assignments and system alerts, newest first.", 
    to: "/notifications", 
    icon: Bell, 
    group: "notifications",
    showBadge: true
  },

  // Support - cases and ops tickets
  {
    id: "cases",
    label: "Cases",
    description: "Structured support cases that group related conversations and follow-ups.",
    to: "/operations/cases",
    icon: Briefcase,
    group: "support"
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer profiles with contact details, bookings and interaction history.",
    to: "/customers",
    icon: UserRound,
    group: "support"
  },
  {
    id: "service-tickets",
    label: "Ops Tickets",
    description: "Operational tickets raised for field or back-office teams to resolve.",
    to: "/operations/tickets",
    icon: Ticket,
    group: "support"
  },

  // Interactions - hierarchical paths
  { 
    id: "text", 
    label: "Inbox",
    description: "Shared email and SMS inbox with all conversation threads and replies.", 
    to: "/interactions/text", 
    icon: Inbox, 
    group: "interactions" 
  },
  { 
    id: "chat", 
    label: "Live Chat",
    description: "Live website chat queue with active visitors and chat history.", 
    to: "/interactions/chat", 
    icon: MessageCircle, 
    group: "interactions" 
  },
  { 
    id: "voice", 
    label: "Voice Calls",
    description: "Phone call log, recordings and voice call handling.", 
    to: "/interactions/voice", 
    icon: Phone, 
    group: "interactions" 
  },

  // Marketing - hierarchical paths
  { 
    id: "campaigns", 
    label: "Campaigns",
    description: "Plan and send marketing campaigns to customer segments.", 
    to: "/marketing/campaigns", 
    icon: Megaphone, 
    group: "marketing" 
  },
  { 
    id: "newsletters", 
    label: "Newsletters",
    description: "Create, schedule and review newsletter sends.", 
    to: "/marketing/newsletters", 
    icon: Mail, 
    group: "marketing" 
  },

  // Operations - hierarchical paths
  { 
    id: "recruitment", 
    label: "Recruitment",
    description: "Applicant pipeline and hiring workflow for operations roles.", 
    to: "/operations/recruitment", 
    icon: Users, 
    group: "operations" 
  },
  { 
    id: "ops-analytics", 
    label: "Operations Analytics",
    description: "Operational dashboards and performance reporting.", 
    to: "/operations/analytics", 
    icon: BarChart3, 
    group: "operations" 
  },
  { 
    id: "bulk-outreach", 
    label: "Bulk Outreach",
    description: "Send templated messages to many customers at once.", 
    to: "/operations/bulk-outreach", 
    icon: Send, 
    group: "operations" 
  },

  // Settings (Personal)
  // General settings moved into the account menu (Settings dialog)
  // Profile moved to the account menu at the bottom of the sidebar
  // Notifications consolidated into the single top-level Notifications entry
  // Single Admin Portal link - visible only to admins
  { 
    id: "admin-portal", 
    label: "Admin Portal",
    description: "Organisation setup: users, inboxes, AI, integrations and policies.", 
    to: "/admin", 
    icon: Shield, 
    group: "settings",
    requiredRole: "admin"
  },
  {
    id: "admin-gdpr",
    label: "GDPR Requests",
    description: "Handle data access and deletion requests from customers.",
    to: "/admin/gdpr",
    icon: FileLock2,
    group: "settings",
    requiredRole: "admin"
  },
  {
    id: "admin-background-jobs",
    label: "Background Jobs",
    description: "Monitor scheduled jobs and background processing runs.",
    to: "/admin/background-jobs",
    icon: Timer,
    group: "settings",
    requiredRole: "admin"
  },
  {
    id: "admin-edge-functions",
    label: "Edge Functions",
    description: "Inspect edge function deployments, logs and health.",
    to: "/admin/edge-functions",
    icon: FunctionSquare,
    group: "settings",
    requiredRole: "admin"
  },


];

export const getGroupedNavItems = (isAdmin: boolean = false, isSuperAdmin: boolean = false) => {
  return NAV_ITEMS.filter(item => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "admin" && (isAdmin || isSuperAdmin)) return true;
    if (item.requiredRole === "super_admin" && isSuperAdmin) return true;
    return false;
  })
  .reduce((groups, item) => {
    const group = groups[item.group] || [];
    return { ...groups, [item.group]: [...group, item] };
  }, {} as Record<string, NavItem[]>);
};

// Dev-only nav debug utility
export const logNavMatch = (pathname: string) => {
  if (import.meta.env.DEV && import.meta.env.VITE_NAV_DEBUG === '1') {
    const matchedItem = NAV_ITEMS.find(item => 
      pathname === item.to || pathname.startsWith(item.to + '/')
    );
    // eslint-disable-next-line no-console
    console.log('Nav match:', { pathname, matched: matchedItem?.id || 'none' });
  }
};

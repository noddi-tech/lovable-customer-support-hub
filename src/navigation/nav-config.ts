import {
  MessageSquare, 
  Phone, 
  Megaphone, 
  Mail, 
  Ticket, 
  DoorOpen, 
  Users,
  BarChart3,
  Settings,
  Cog,
  User,
  Bell,
  MailOpen,
  Building2,
  Workflow,
  Wrench,
  Inbox,
  Activity,
  Download,
  Search,
  LayoutDashboard
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: any;
  group: "notifications" | "interactions" | "marketing" | "operations" | "settings" | "admin" | "super_admin";
  requiredRole?: "admin" | "super_admin";
  showBadge?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // Search - Global search page
  { 
    id: "search", 
    label: "Search", 
    to: "/search", 
    icon: Search, 
    group: "notifications"
  },
  
  // Notifications - Above interactions
  { 
    id: "notifications", 
    label: "Notifications", 
    to: "/notifications", 
    icon: Bell, 
    group: "notifications",
    showBadge: true
  },

  // Interactions - hierarchical paths
  { 
    id: "text", 
    label: "Text Messages", 
    to: "/interactions/text", 
    icon: MessageSquare, 
    group: "interactions" 
  },
  { 
    id: "voice", 
    label: "Voice Calls", 
    to: "/interactions/voice", 
    icon: Phone, 
    group: "interactions" 
  },

  // Marketing - hierarchical paths
  { 
    id: "campaigns", 
    label: "Campaigns", 
    to: "/marketing/campaigns", 
    icon: Megaphone, 
    group: "marketing" 
  },
  { 
    id: "newsletters", 
    label: "Newsletters", 
    to: "/marketing/newsletters", 
    icon: Mail, 
    group: "marketing" 
  },

  // Operations - hierarchical paths
  { 
    id: "service-tickets", 
    label: "Service Tickets", 
    to: "/operations/tickets", 
    icon: Ticket, 
    group: "operations" 
  },
  { 
    id: "doorman", 
    label: "Doorman Interface", 
    to: "/operations/doorman", 
    icon: DoorOpen, 
    group: "operations" 
  },
  { 
    id: "recruitment", 
    label: "Recruitment", 
    to: "/operations/recruitment", 
    icon: Users, 
    group: "operations" 
  },
  { 
    id: "ops-analytics", 
    label: "Operations Analytics", 
    to: "/operations/analytics", 
    icon: BarChart3, 
    group: "operations" 
  },
  { 
    id: "ops-settings", 
    label: "Operations Settings", 
    to: "/operations/settings", 
    icon: Settings, 
    group: "operations" 
  },

  // Settings (Personal)
  { 
    id: "settings-general", 
    label: "General", 
    to: "/settings", 
    icon: Cog, 
    group: "settings" 
  },
  { 
    id: "settings-profile", 
    label: "Profile", 
    to: "/settings/profile", 
    icon: User, 
    group: "settings" 
  },
  { 
    id: "settings-notifications", 
    label: "Notifications", 
    to: "/settings/notifications", 
    icon: Bell, 
    group: "settings" 
  },

  // Admin (RBAC) - Consolidated modular items
  { 
    id: "admin-overview", 
    label: "Overview", 
    to: "/admin", 
    icon: LayoutDashboard, 
    group: "admin", 
    requiredRole: "admin" 
  },
  { 
    id: "admin-users", 
    label: "Users & Teams", 
    to: "/admin/users", 
    icon: Users, 
    group: "admin", 
    requiredRole: "admin" 
  },
  { 
    id: "admin-inboxes", 
    label: "Inboxes", 
    to: "/admin/inboxes", 
    icon: Inbox, 
    group: "admin", 
    requiredRole: "admin" 
  },
  { 
    id: "admin-integrations", 
    label: "Integrations & Routing", 
    to: "/admin/integrations", 
    icon: Workflow, 
    group: "admin", 
    requiredRole: "admin" 
  },
  { 
    id: "admin-design", 
    label: "Design", 
    to: "/admin/design", 
    icon: Wrench, 
    group: "admin", 
    requiredRole: "admin" 
  },
  { 
    id: "admin-general", 
    label: "General Settings", 
    to: "/admin/general", 
    icon: Cog, 
    group: "admin", 
    requiredRole: "admin" 
  },
  { 
    id: "admin-health", 
    label: "System Health", 
    to: "/admin/health", 
    icon: Activity, 
    group: "admin", 
    requiredRole: "admin" 
  },

  // Super Admin - System-wide administration
  { 
    id: "super-admin-dashboard", 
    label: "Dashboard", 
    to: "/super-admin/dashboard", 
    icon: BarChart3, 
    group: "super_admin", 
    requiredRole: "super_admin" 
  },
  { 
    id: "super-admin-organizations", 
    label: "Organizations", 
    to: "/super-admin/organizations", 
    icon: Building2, 
    group: "super_admin", 
    requiredRole: "super_admin" 
  },
  { 
    id: "super-admin-users", 
    label: "All Users", 
    to: "/super-admin/users", 
    icon: Users, 
    group: "super_admin", 
    requiredRole: "super_admin" 
  },
  { 
    id: "super-admin-analytics", 
    label: "System Analytics", 
    to: "/super-admin/analytics", 
    icon: BarChart3, 
    group: "super_admin", 
    requiredRole: "super_admin" 
  },
  { 
    id: "super-admin-import", 
    label: "Import Data", 
    to: "/super-admin/import", 
    icon: Download, 
    group: "super_admin", 
    requiredRole: "super_admin" 
  },
];

export const getGroupedNavItems = (isAdmin: boolean = false, isSuperAdmin: boolean = false) => {
  return NAV_ITEMS.filter(item => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "admin" && isAdmin) return true;
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
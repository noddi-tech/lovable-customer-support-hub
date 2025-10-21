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
  Bug
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: any;
  group: "interactions" | "marketing" | "operations" | "settings" | "admin";
  requiredRole?: "admin";
};

export const NAV_ITEMS: NavItem[] = [
  // Interactions
  { 
    id: "text", 
    label: "Text Messages", 
    to: "/", 
    icon: MessageSquare, 
    group: "interactions" 
  },
  { 
    id: "voice", 
    label: "Voice Calls", 
    to: "/voice", 
    icon: Phone, 
    group: "interactions" 
  },

  // Marketing
  { 
    id: "campaigns", 
    label: "Campaigns", 
    to: "/marketing", 
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

  // Operations
  { 
    id: "service-tickets", 
    label: "Service Tickets", 
    to: "/operations", 
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
    id: "admin-debug", 
    label: "Debug", 
    to: "/admin/debug", 
    icon: Bug, 
    group: "admin", 
    requiredRole: "admin" 
  },
];

export const getGroupedNavItems = (isAdmin: boolean = false) => {
  return NAV_ITEMS.filter(item => !item.requiredRole || (item.requiredRole === "admin" && isAdmin))
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
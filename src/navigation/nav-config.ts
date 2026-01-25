import {
  MessageSquare, 
  MessageCircle,
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
  Shield,
  Search
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: any;
  group: "notifications" | "interactions" | "marketing" | "operations" | "settings";
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
    id: "chat", 
    label: "Chat", 
    to: "/interactions/chat", 
    icon: MessageCircle, 
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
  // Single Admin Portal link - visible only to admins
  { 
    id: "admin-portal", 
    label: "Admin Portal", 
    to: "/admin", 
    icon: Shield, 
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

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useRealtimeConnection } from "@/contexts/RealtimeProvider";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Inbox, 
  Plug2, 
  Palette, 
  Brain, 
  Settings,
  Activity,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface NavigationCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { currentOrganizationId } = useOrganizationStore();
  const { connectionStatus, forceReconnect } = useRealtimeConnection();

  // Fetch user count
  const { data: userCount } = useQuery({
    queryKey: ['admin-user-count', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return 0;
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId);
      return count || 0;
    },
    enabled: !!currentOrganizationId
  });

  // Fetch inbox count
  const { data: inboxCount } = useQuery({
    queryKey: ['admin-inbox-count', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return 0;
      const { count } = await supabase
        .from('inboxes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!currentOrganizationId
  });

  // Fetch active integrations count
  const { data: integrationCount } = useQuery({
    queryKey: ['admin-integration-count', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return 0;
      const { count } = await supabase
        .from('email_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!currentOrganizationId
  });

  // Fetch email stats for health summary
  const { data: emailStats } = useQuery({
    queryKey: ['admin-email-stats', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayEmails } = await supabase
        .from('email_ingestion_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .eq('status', 'processed');

      const { data: lastEmail } = await supabase
        .from('email_ingestion_logs')
        .select('created_at')
        .eq('status', 'processed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        todayCount: todayEmails?.length || 0,
        lastEmailAt: lastEmail?.created_at
      };
    },
    enabled: !!currentOrganizationId
  });

  const navigationCards: NavigationCard[] = [
    {
      title: "Users & Teams",
      description: "Manage team members and departments",
      icon: Users,
      path: "/admin/users",
      badge: userCount ? `${userCount} users` : undefined
    },
    {
      title: "Inboxes",
      description: "Configure inbox routing and settings",
      icon: Inbox,
      path: "/admin/inboxes",
      badge: inboxCount ? `${inboxCount} active` : undefined
    },
    {
      title: "Integrations & Routing",
      description: "Email, voice, and notification integrations",
      icon: Plug2,
      path: "/admin/integrations",
      badge: integrationCount ? `${integrationCount} connected` : undefined
    },
    {
      title: "Design & Branding",
      description: "Customize appearance and templates",
      icon: Palette,
      path: "/admin/design"
    },
    {
      title: "Knowledge Management",
      description: "AI training and response templates",
      icon: Brain,
      path: "/admin/knowledge"
    },
    {
      title: "General Settings",
      description: "Organization preferences and config",
      icon: Settings,
      path: "/admin/general"
    }
  ];

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: CheckCircle2, text: 'Connected', color: 'text-green-500' };
      case 'connecting':
        return { icon: Activity, text: 'Connecting...', color: 'text-yellow-500' };
      case 'disconnected':
        return { icon: AlertCircle, text: 'Reconnecting...', color: 'text-yellow-500' };
      case 'error':
        return { icon: AlertCircle, text: 'Using backup sync (10s refresh)', color: 'text-yellow-500' };
      default:
        return { icon: AlertCircle, text: 'Disconnected', color: 'text-destructive' };
    }
  };

  const connectionDisplay = getConnectionStatusDisplay();
  const ConnectionIcon = connectionDisplay.icon;

  const formatLastEmail = (timestamp: string | undefined) => {
    if (!timestamp) return 'No emails yet';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and integrations
        </p>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navigationCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.path}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => navigate(card.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  {card.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {card.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg flex items-center gap-2 mt-3">
                  {card.title}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* System Health Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">System Health</CardTitle>
            </div>
            <button
              onClick={() => navigate('/admin/health')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <ConnectionIcon className={`w-4 h-4 ${connectionDisplay.color}`} />
              <span className="text-sm font-medium">{connectionDisplay.text}</span>
              {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
                <Button variant="ghost" size="sm" onClick={forceReconnect} className="h-6 px-2 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reconnect
                </Button>
              )}
            </div>

            {/* Last Email */}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Last email: <span className="font-medium">{formatLastEmail(emailStats?.lastEmailAt)}</span>
              </span>
            </div>

            {/* Today's Count */}
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Today: <span className="font-medium">{emailStats?.todayCount || 0} emails</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
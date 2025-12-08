import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Clock, Mail, RefreshCw, Settings, Shield, Eye, EyeOff, Copy, ExternalLink, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, subDays } from "date-fns";

interface EmailHealthDashboardProps {
  organizationId: string;
  organizationName: string;
}

interface EmailIngestionLog {
  id: string;
  source: string;
  status: string;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  external_id: string | null;
  conversation_id: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

interface EmailStats {
  total_today: number;
  total_7_days: number;
  sendgrid_count: number;
  gmail_count: number;
  failed_count: number;
  last_email_at: string | null;
}

interface TokenConfig {
  webhookBaseUrl: string;
  envToken: string | null;
  envTokenPreview: string | null;
  dbToken: string | null;
  tokensMatch: boolean;
  fullWebhookUrl: string;
  routes: { id: string; address: string; hasToken: boolean }[];
}

export function EmailHealthDashboard({ organizationId, organizationName }: EmailHealthDashboardProps) {
  const queryClient = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showToken, setShowToken] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<{ match: boolean; message: string } | null>(null);

  // Fetch org-scoped email stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["email-health-stats", organizationId],
    queryFn: async (): Promise<EmailStats> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const sevenDaysAgo = subDays(now, 7).toISOString();

      // Get conversation IDs for this organization first
      const { data: orgConversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("organization_id", organizationId);
      
      const conversationIds = orgConversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        return {
          total_today: 0,
          total_7_days: 0,
          sendgrid_count: 0,
          gmail_count: 0,
          failed_count: 0,
          last_email_at: null,
        };
      }

      // Get logs for this org's conversations
      const [todayResult, weekResult, lastEmailResult] = await Promise.all([
        supabase
          .from("email_ingestion_logs")
          .select("id, source, status", { count: "exact" })
          .in("conversation_id", conversationIds)
          .gte("created_at", todayStart),
        supabase
          .from("email_ingestion_logs")
          .select("id, source, status", { count: "exact" })
          .in("conversation_id", conversationIds)
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("email_ingestion_logs")
          .select("created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      const weekLogs = weekResult.data || [];

      return {
        total_today: todayResult.count || 0,
        total_7_days: weekResult.count || 0,
        sendgrid_count: weekLogs.filter((l: any) => l.source === "sendgrid").length,
        gmail_count: weekLogs.filter((l: any) => l.source === "gmail_sync").length,
        failed_count: weekLogs.filter((l: any) => l.status === "failed" || l.status === "auth_failed").length,
        last_email_at: lastEmailResult.data?.created_at || null,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch org-scoped recent logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["email-ingestion-logs", organizationId, sourceFilter, statusFilter],
    queryFn: async (): Promise<EmailIngestionLog[]> => {
      // Get conversation IDs for this organization
      const { data: orgConversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("organization_id", organizationId);
      
      const conversationIds = orgConversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("email_ingestion_logs")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailIngestionLog[];
    },
    refetchInterval: 30000,
  });

  // Fetch org-scoped token configuration
  const { data: tokenConfig, isLoading: tokenConfigLoading, refetch: refetchTokenConfig } = useQuery({
    queryKey: ["sendgrid-token-config", organizationId],
    queryFn: async (): Promise<TokenConfig | null> => {
      const { data, error } = await supabase.functions.invoke("update-sendgrid-token", {
        body: { action: "get-config", organizationId },
      });
      if (error) {
        console.error("Failed to fetch token config:", error);
        return null;
      }
      return data?.config || null;
    },
  });

  // Fetch org-scoped inbound routes for fallback token display
  const { data: inboundRoutes } = useQuery({
    queryKey: ["inbound-routes-tokens", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_routes")
        .select("id, address, secret_token")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("sendgrid-inbound", {
        method: "GET",
      });
      return response;
    },
    onSuccess: (response) => {
      if (response.data?.status === "alive") {
        toast.success("Webhook is online and responding", {
          description: `Token configured: ${response.data.environment?.hasInboundToken ? "Yes" : "No"}`,
        });
      } else {
        toast.error("Webhook test failed", { description: response.error?.message });
      }
    },
    onError: (error) => {
      toast.error("Webhook test failed", { description: String(error) });
    },
  });

  // Test token match mutation
  const testTokenMatchMutation = useMutation({
    mutationFn: async (testToken: string) => {
      const { data, error } = await supabase.functions.invoke("update-sendgrid-token", {
        body: { action: "test-token", testToken, organizationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTokenTestResult({
        match: data.tokenMatch,
        message: data.message,
      });
      if (data.tokenMatch) {
        toast.success("Token verified successfully!");
      } else {
        toast.error("Token mismatch detected");
      }
    },
    onError: (error) => {
      toast.error("Token test failed", { description: String(error) });
    },
  });

  // Update token mutation
  const updateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.functions.invoke("update-sendgrid-token", {
        body: { action: "update-token", token, organizationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Token updated in database", {
        description: data.nextStep,
      });
      setNewToken("");
      setIsUpdatingToken(false);
      setTokenTestResult(null);
      queryClient.invalidateQueries({ queryKey: ["inbound-routes-tokens", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["sendgrid-token-config", organizationId] });
    },
    onError: (error) => {
      toast.error("Failed to update token", { description: String(error) });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Processed</Badge>;
      case "received":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Received</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "auth_failed":
        return <Badge variant="destructive">Auth Failed</Badge>;
      case "duplicate":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Duplicate</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getHealthStatus = () => {
    if (!stats?.last_email_at) return { status: "unknown", color: "text-muted-foreground", icon: Clock };
    
    const lastEmail = new Date(stats.last_email_at);
    const hoursSince = (Date.now() - lastEmail.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 2) return { status: "healthy", color: "text-green-500", icon: CheckCircle };
    if (hoursSince < 6) return { status: "warning", color: "text-yellow-500", icon: AlertCircle };
    return { status: "critical", color: "text-destructive", icon: AlertCircle };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;
  const currentToken = tokenConfig?.dbToken || inboundRoutes?.[0]?.secret_token || "";
  const fullWebhookUrl = tokenConfig?.fullWebhookUrl || `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sendgrid-inbound${currentToken ? `?token=${currentToken}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Email Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <HealthIcon className={`h-5 w-5 ${health.color}`} />
              <span className={`text-lg font-semibold capitalize ${health.color}`}>
                {health.status}
              </span>
            </div>
            {stats?.last_email_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Last email: {formatDistanceToNow(new Date(stats.last_email_at), { addSuffix: true })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.total_today || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">emails processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.total_7_days || 0}</span>
            </div>
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              <span>SendGrid: {stats?.sendgrid_count || 0}</span>
              <span>•</span>
              <span>Gmail: {stats?.gmail_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${(stats?.failed_count || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${(stats?.failed_count || 0) > 0 ? 'text-destructive' : ''}`}>
                {stats?.failed_count || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">auth/processing errors</p>
          </CardContent>
        </Card>
      </div>

      {/* SendGrid Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SendGrid Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure and test your SendGrid Inbound Parse webhook for {organizationName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Status Alert */}
          {tokenConfig && !tokenConfig.tokensMatch && tokenConfig.envToken && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Token mismatch detected!</strong> The database token does not match SENDGRID_INBOUND_TOKEN in Supabase secrets. 
                Emails will be rejected until tokens match.
              </AlertDescription>
            </Alert>
          )}
          
          {tokenConfig && !tokenConfig.envToken && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>SENDGRID_INBOUND_TOKEN not configured!</strong> Add this secret in{" "}
                <a
                  href="https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Supabase Secrets
                </a>
              </AlertDescription>
            </Alert>
          )}

          {tokenConfig?.tokensMatch && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                <strong>Tokens match!</strong> Webhook is configured correctly.
              </AlertDescription>
            </Alert>
          )}

          {/* Full Webhook URL - Primary Display */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Complete Webhook URL
              <Badge variant="outline" className="text-xs">Copy this to SendGrid</Badge>
            </Label>
            <div className="flex gap-2">
              <Input 
                value={fullWebhookUrl} 
                readOnly 
                className="font-mono text-sm bg-muted" 
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(fullWebhookUrl);
                  toast.success("Copied complete webhook URL");
                }}
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the complete URL to paste into SendGrid Inbound Parse → Destination URL
            </p>
          </div>

          {/* Token Display & Edit */}
          <div className="space-y-2">
            <Label>Authentication Token (in database)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showToken ? "text" : "password"}
                  value={currentToken}
                  readOnly
                  className="font-mono text-sm pr-10"
                  placeholder="No token configured"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  testTokenMatchMutation.mutate(currentToken);
                }}
                disabled={!currentToken || testTokenMatchMutation.isPending}
                title="Verify token matches Supabase secret"
              >
                <Shield className="h-4 w-4 mr-1" />
                Verify
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsUpdatingToken(!isUpdatingToken)}
              >
                Update
              </Button>
            </div>
            
            {tokenTestResult && (
              <div className={`flex items-center gap-2 text-sm ${tokenTestResult.match ? 'text-green-600' : 'text-destructive'}`}>
                {tokenTestResult.match ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {tokenTestResult.message}
              </div>
            )}
          </div>

          {isUpdatingToken && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <Label>Enter or Generate New Token</Label>
              <div className="flex gap-2">
                <Input
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Paste your SendGrid URL token or generate a new one..."
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const generated = crypto.randomUUID().replace(/-/g, "");
                    setNewToken(generated);
                  }}
                >
                  Generate
                </Button>
                <Button
                  onClick={() => updateTokenMutation.mutate(newToken)}
                  disabled={!newToken || updateTokenMutation.isPending}
                >
                  Save
                </Button>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  After saving, you must also update <code className="bg-muted px-1 rounded">SENDGRID_INBOUND_TOKEN</code> in{" "}
                  <a
                    href="https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/functions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    Supabase Secrets <ExternalLink className="h-3 w-3" />
                  </a>
                  {" "}to match, then click "Verify" to confirm they match.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => testWebhookMutation.mutate()}
              disabled={testWebhookMutation.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              Test Webhook
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetchTokenConfig();
                queryClient.invalidateQueries({ queryKey: ["email-health-stats", organizationId] });
                queryClient.invalidateQueries({ queryKey: ["email-ingestion-logs", organizationId] });
                setTokenTestResult(null);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Ingestion Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Email Ingestion Logs</span>
            <div className="flex gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="gmail_sync">Gmail Sync</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="auth_failed">Auth Failed</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email ingestion logs for {organizationName}. Logs will appear here when emails are received.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.source.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="max-w-40 truncate" title={log.from_email || ""}>
                      {log.from_email || "-"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate" title={log.subject || ""}>
                      {log.subject || "-"}
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-destructive text-xs" title={log.error_message || ""}>
                      {log.error_message || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

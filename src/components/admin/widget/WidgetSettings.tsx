import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BarChart3,
  Code,
  Eye,
  Globe,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/integrations/supabase/client"
import { SUPPORTED_WIDGET_LANGUAGES } from "@/widget/translations"
import { WidgetAnalytics } from "./WidgetAnalytics"
import { WidgetDeployPanel } from "./WidgetDeployPanel"
import { WidgetEmbedCode } from "./WidgetEmbedCode"
import { WidgetPreview } from "./WidgetPreview"
import { WidgetTranslationEditor } from "./WidgetTranslationEditor"

interface WidgetConfig {
  id: string
  widget_key: string
  inbox_id: string
  organization_id: string
  primary_color: string
  position: string
  greeting_text: string
  response_time_text: string
  dismissal_message_text: string
  greeting_translations: Record<string, string>
  response_time_translations: Record<string, string>
  dismissal_message_translations: Record<string, string>
  enable_chat: boolean
  enable_contact_form: boolean
  enable_knowledge_search: boolean
  logo_url: string | null
  company_name: string | null
  is_active: boolean
  created_at: string
  language: string
  inboxes?: { name: string } | null
}

export const WidgetSettings: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)

  // Fetch organization ID
  const { data: organizationId } = useQuery({
    queryKey: ["user-organization-id"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_organization_id")
      if (error) throw error
      return data
    },
  })

  // Fetch inboxes for the organization
  const { data: inboxes = [] } = useQuery({
    queryKey: ["inboxes", organizationId],
    queryFn: async () => {
      if (!organizationId) return []
      const { data, error } = await supabase
        .from("inboxes")
        .select("id, name, is_active")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name")
      if (error) throw error
      return data
    },
    enabled: !!organizationId,
  })

  // Fetch widget configs
  const { data: widgetConfigs = [], isLoading } = useQuery({
    queryKey: ["widget-configs", organizationId],
    queryFn: async () => {
      if (!organizationId) return []
      const { data, error } = await supabase
        .from("widget_configs")
        .select(`
          *,
          inboxes (name)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as WidgetConfig[]
    },
    enabled: !!organizationId,
  })

  // Create widget config mutation
  const createWidgetMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      if (!organizationId) throw new Error("No organization")

      const widgetKey = crypto.randomUUID()

      const { data, error } = await supabase
        .from("widget_configs")
        .insert({
          inbox_id: inboxId,
          organization_id: organizationId,
          widget_key: widgetKey,
          greeting_text: "Hi there! 👋 How can we help you today?",
          response_time_text: "We usually respond within a few hours",
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["widget-configs"] })
      setSelectedWidgetId(data.id)
      toast.success("Widget created successfully")
    },
    onError: (error: any) => {
      toast.error(`Failed to create widget: ${error.message}`)
    },
  })

  // Update widget config mutation with optimistic updates
  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WidgetConfig> }) => {
      const { data, error } = await supabase
        .from("widget_configs")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["widget-configs", organizationId] })

      // Snapshot previous value
      const previousConfigs = queryClient.getQueryData<WidgetConfig[]>([
        "widget-configs",
        organizationId,
      ])

      // Optimistically update the cache
      queryClient.setQueryData<WidgetConfig[]>(["widget-configs", organizationId], (old) =>
        old?.map((widget) => (widget.id === id ? { ...widget, ...updates } : widget)),
      )

      return { previousConfigs }
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousConfigs) {
        queryClient.setQueryData(["widget-configs", organizationId], context.previousConfigs)
      }
      toast.error(`Failed to update widget: ${error.message}`)
    },
    onSuccess: () => {
      toast.success("Widget updated")
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["widget-configs", organizationId] })
    },
  })

  const selectedWidget = widgetConfigs.find((w) => w.id === selectedWidgetId)

  // Local state for language to prevent race conditions
  const [selectedLanguage, setSelectedLanguage] = useState(selectedWidget?.language || "no")

  // Sync local language state when selected widget changes
  useEffect(() => {
    if (selectedWidget?.language) {
      setSelectedLanguage(selectedWidget.language)
    }
  }, [selectedWidget?.language])

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value) // Update local state immediately
    handleUpdateWidget({ language: value }) // Send to server
  }

  const handleUpdateWidget = (updates: Partial<WidgetConfig>) => {
    if (!selectedWidgetId) return
    updateWidgetMutation.mutate({ id: selectedWidgetId, updates })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Contact Widget</Heading>
          <p className="text-muted-foreground mt-1">
            Create an embeddable widget for your website to collect customer inquiries
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Prominent deploy call-to-action */}
        <WidgetDeployPanel />

        {/* Widget selector (top bar) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2 w-full sm:max-w-md">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Widget
                </Label>
                {widgetConfigs.length > 0 ? (
                  <Select
                    value={selectedWidgetId ?? undefined}
                    onValueChange={(id) => setSelectedWidgetId(id)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a widget to configure" />
                    </SelectTrigger>
                    <SelectContent>
                      {widgetConfigs.map((widget) => (
                        <SelectItem key={widget.id} value={widget.id}>
                          <span className="flex items-center gap-2">
                            <span className="truncate">
                              {widget.inboxes?.name || "Unknown Inbox"}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {widget.widget_key.slice(0, 8)}…
                            </span>
                            {!widget.is_active && (
                              <span className="text-xs text-muted-foreground">(inactive)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No widgets yet. Create one to get started.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {selectedWidget && (
                  <Badge
                    variant={selectedWidget.is_active ? "default" : "secondary"}
                    className={
                      selectedWidget.is_active ? "bg-green-500 hover:bg-green-500 text-white" : ""
                    }
                  >
                    {selectedWidget.is_active ? "Active" : "Inactive"}
                  </Badge>
                )}
                {inboxes.filter((inbox) => !widgetConfigs.some((w) => w.inbox_id === inbox.id))
                  .length > 0 && (
                  <Select onValueChange={(inboxId) => createWidgetMutation.mutate(inboxId)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Create Widget</span>
                    </SelectTrigger>
                    <SelectContent>
                      {inboxes
                        .filter((inbox) => !widgetConfigs.some((w) => w.inbox_id === inbox.id))
                        .map((inbox) => (
                          <SelectItem key={inbox.id} value={inbox.id}>
                            {inbox.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area with Tabs */}
        {selectedWidget ? (
          <Card className="w-full min-w-0">
            <Tabs defaultValue="settings" className="w-full">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedWidget.inboxes?.name || "Widget"} Configuration
                    </CardTitle>
                    <CardDescription>Customize your widget settings and appearance</CardDescription>
                  </div>
                </div>

                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                  <TabsTrigger value="settings" className="gap-1.5">
                    <Settings className="h-4 w-4" />
                    <span className="hidden lg:inline">Settings</span>
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span className="hidden lg:inline">Preview</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden lg:inline">Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger value="embed" className="gap-1.5">
                    <Code className="h-4 w-4" />
                    <span className="hidden lg:inline">Embed</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0 space-y-6 min-w-0">
                  {/* Appearance */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Appearance
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selectedWidget.primary_color}
                            onChange={(e) => handleUpdateWidget({ primary_color: e.target.value })}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={selectedWidget.primary_color}
                            onChange={(e) => handleUpdateWidget({ primary_color: e.target.value })}
                            placeholder="#7c3aed"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select
                          value={selectedWidget.position}
                          onValueChange={(value) => handleUpdateWidget({ position: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Language
                        </Label>
                        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_WIDGET_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input
                          value={selectedWidget.company_name || ""}
                          onChange={(e) => handleUpdateWidget({ company_name: e.target.value })}
                          placeholder="Your Company"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Logo URL</Label>
                        <Input
                          value={selectedWidget.logo_url || ""}
                          onChange={(e) => handleUpdateWidget({ logo_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Default Messages</h4>
                    <p className="text-xs text-muted-foreground">
                      These are used as fallback when no per-language customization exists.
                    </p>

                    <div className="space-y-2">
                      <Label>Default Greeting Text</Label>
                      <Textarea
                        value={selectedWidget.greeting_text}
                        onChange={(e) => handleUpdateWidget({ greeting_text: e.target.value })}
                        placeholder="Hi there! How can we help?"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Default Response Time Text</Label>
                      <Input
                        value={selectedWidget.response_time_text}
                        onChange={(e) => handleUpdateWidget({ response_time_text: e.target.value })}
                        placeholder="We usually respond within..."
                      />
                    </div>
                  </div>

                  {/* Per-Language Translations */}
                  <WidgetTranslationEditor
                    greetingText={selectedWidget.greeting_text}
                    responseTimeText={selectedWidget.response_time_text}
                    dismissalMessageText={
                      selectedWidget.dismissal_message_text ||
                      "Due to high demand, we can't connect you with an agent right now. We'll follow up with you via email shortly."
                    }
                    greetingTranslations={selectedWidget.greeting_translations || {}}
                    responseTimeTranslations={selectedWidget.response_time_translations || {}}
                    dismissalMessageTranslations={
                      selectedWidget.dismissal_message_translations || {}
                    }
                    onUpdate={handleUpdateWidget}
                  />

                  {/* Features */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Features</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Live Chat
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Real-time chat when agents are online
                          </p>
                        </div>
                        <Switch
                          checked={selectedWidget.enable_chat}
                          onCheckedChange={(checked) =>
                            handleUpdateWidget({ enable_chat: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Contact Form
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Allow visitors to send messages
                          </p>
                        </div>
                        <Switch
                          checked={selectedWidget.enable_contact_form}
                          onCheckedChange={(checked) =>
                            handleUpdateWidget({ enable_contact_form: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Knowledge Search
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Let visitors search your FAQ
                          </p>
                        </div>
                        <Switch
                          checked={selectedWidget.enable_knowledge_search}
                          onCheckedChange={(checked) =>
                            handleUpdateWidget({ enable_knowledge_search: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">Widget Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable or disable this widget on your website
                      </p>
                    </div>
                    <Switch
                      checked={selectedWidget.is_active}
                      onCheckedChange={(checked) => handleUpdateWidget({ is_active: checked })}
                    />
                  </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="mt-0">
                  <WidgetPreview config={selectedWidget} />
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="mt-0">
                  <WidgetAnalytics widgetId={selectedWidget.id} />
                </TabsContent>

                {/* Embed Code Tab */}
                <TabsContent value="embed" className="mt-0 overflow-hidden">
                  <WidgetEmbedCode widgetKey={selectedWidget.widget_key} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        ) : (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Select or Create a Widget</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a widget from the list or create a new one to configure
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

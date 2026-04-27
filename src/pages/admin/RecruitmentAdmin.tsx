import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { useSearchParams } from "react-router-dom";
import { Workflow, Mail, Zap, Link2, History } from "lucide-react";
import { PipelineEditor } from "@/components/dashboard/recruitment/admin/pipeline/PipelineEditor";
import { EmailTemplatesTab } from "@/components/dashboard/recruitment/admin/templates/EmailTemplatesTab";
import { RulesTab } from "@/components/dashboard/recruitment/admin/rules/RulesTab";
import { IntegrationsTab } from "@/components/dashboard/recruitment/admin/integrations/IntegrationsTab";
import { FailureBanner } from "@/components/dashboard/recruitment/admin/FailureBanner";
import { useExecutionRealtimeToast } from "@/components/dashboard/recruitment/admin/hooks/useExecutionRealtimeToast";

const VALID_TABS = ["pipeline", "templates", "automation", "integrations", "audit"] as const;

export default function RecruitmentAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as typeof VALID_TABS[number])
    ? (tabParam as string)
    : "pipeline";

  useExecutionRealtimeToast();

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (value !== 'automation') next.delete('subtab');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading level={1} className="text-2xl font-semibold">
          Rekruttering
        </Heading>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurer pipeline, e-postmaler, automatisering og integrasjoner for rekrutteringsmodulen.
        </p>
      </div>

      <FailureBanner />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="pipeline">
            <Workflow className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4" />
            E-postmaler
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Zap className="h-4 w-4" />
            Automatisering
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Link2 className="h-4 w-4" />
            Integrasjoner
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4" />
            Revisjon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineEditor />
        </TabsContent>
        <TabsContent value="templates">
          <EmailTemplatesTab />
        </TabsContent>
        <TabsContent value="automation">
          <RulesTab />
        </TabsContent>
        <TabsContent value="integrations">
          <PlaceholderTab
            title="Integrasjoner"
            description="Koble til Finn.no, Meta Lead Ads og andre kilder for innkommende søknader."
          />
        </TabsContent>
        <TabsContent value="audit">
          <PlaceholderTab
            title="Revisjon"
            description="Se historikk over endringer i rekrutteringsoppsettet og søknadsbehandling."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">Kommer snart</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Denne seksjonen er under utvikling og blir tilgjengelig snart.
        </p>
      </CardContent>
    </Card>
  );
}

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlateInput } from "@/components/bulk-outreach/PlateInput";
import { RouteDatePicker } from "@/components/bulk-outreach/RouteDatePicker";
import { RecipientReview, Recipient } from "@/components/bulk-outreach/RecipientReview";
import { MessageComposer } from "@/components/bulk-outreach/MessageComposer";
import { SendConfirmation } from "@/components/bulk-outreach/SendConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

const STEPS = ["Add Customers", "Review Recipients", "Compose Message", "Confirm & Send"];

/** Upsert incoming results into existing recipients by plate */
function mergeRecipients(prev: Recipient[], incoming: Recipient[]): Recipient[] {
  const map = new Map(prev.map((r) => [r.plate, r]));
  for (const r of incoming) {
    map.set(r.plate, { ...r, selected: r.matched });
  }
  return Array.from(map.values());
}

export default function BulkOutreach() {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [inboxId, setInboxId] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent_count: number; failed_count: number } | null>(null);

  const organizationId = profile?.organization_id;

  const handlePlateLookup = useCallback(async (plates: string[]) => {
    if (!organizationId) {
      toast.error("No organization context available");
      return;
    }
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-outreach", {
        body: { action: "resolve_plates", plates, organization_id: organizationId },
      });
      if (error) throw error;

      const results: Recipient[] = (data.results || []).map((r: any) => ({
        ...r,
        selected: r.matched,
        reason: r.reason || undefined,
        source: r.source || undefined,
      }));
      setRecipients((prev) => mergeRecipients(prev, results));
      toast.success(`Looked up ${plates.length} plates, found ${results.filter((r) => r.matched).length} matches`);
    } catch (err) {
      console.error("Plate lookup error:", err);
      toast.error("Failed to look up plates");
    } finally {
      setIsLookingUp(false);
    }
  }, [organizationId]);

  const handleFetchBookings = useCallback(async (date: string) => {
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-outreach", {
        body: { action: "list_route_bookings", date, organization_id: organizationId },
      });
      if (error) throw error;

      const bookings: Recipient[] = (data.bookings || []).map((b: any) => ({
        plate: b.plate,
        name: b.name,
        email: b.email,
        phone: b.phone,
        matched: b.matched,
        selected: b.matched,
      }));
      setRecipients((prev) => mergeRecipients(prev, bookings));
      toast.success(`Found ${bookings.length} bookings for ${date}`);
    } catch (err) {
      console.error("Booking fetch error:", err);
      toast.error("Failed to fetch bookings");
    } finally {
      setIsLookingUp(false);
    }
  }, [organizationId]);

  const handleToggle = (index: number) => {
    setRecipients((prev) =>
      prev.map((r, i) => (i === index && r.matched ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setRecipients((prev) => prev.map((r) => (r.matched ? { ...r, selected: checked } : r)));
  };

  const handleSend = useCallback(async () => {
    const selected = recipients.filter((r) => r.selected);
    if (selected.length === 0) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-outreach", {
        body: {
          action: "send_bulk",
          recipients: selected.map((r) => ({ email: r.email, name: r.name, plate: r.plate })),
          subject,
          message_template: messageTemplate,
          inbox_id: inboxId,
          organization_id: profile?.organization_id,
        },
      });
      if (error) throw error;
      setSendResult({ sent_count: data.sent_count, failed_count: data.failed_count });
      toast.success(`Sent ${data.sent_count} emails successfully`);
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send bulk emails");
    } finally {
      setIsSending(false);
    }
  }, [recipients, subject, messageTemplate, inboxId, profile?.organization_id]);

  const selectedCount = recipients.filter((r) => r.selected).length;
  const canProceed = [
    recipients.length > 0,
    selectedCount > 0,
    subject.trim() && messageTemplate.trim(),
    true,
  ];

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Customer Outreach</h1>
        <p className="text-muted-foreground">
          Send individual email conversations to multiple customers at once
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <Tabs defaultValue="plates">
              <TabsList>
                <TabsTrigger value="plates">By Registration Number</TabsTrigger>
                <TabsTrigger value="route">By Route / Date</TabsTrigger>
              </TabsList>
              <TabsContent value="plates" className="mt-4">
                <PlateInput onLookup={handlePlateLookup} isLoading={isLookingUp} />
              </TabsContent>
              <TabsContent value="route" className="mt-4">
                <RouteDatePicker onFetchBookings={handleFetchBookings} isLoading={isLookingUp} />
              </TabsContent>
              {recipients.length > 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {recipients.length} plates loaded ({recipients.filter(r => r.matched).length} matched). Click Next to review.
                </p>
              )}
            </Tabs>
          )}

          {step === 1 && (
            <RecipientReview
              recipients={recipients}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          )}

          {step === 2 && (
            <MessageComposer
              subject={subject}
              onSubjectChange={setSubject}
              messageTemplate={messageTemplate}
              onMessageChange={setMessageTemplate}
              inboxId={inboxId}
              onInboxChange={setInboxId}
            />
          )}

          {step === 3 && (
            <SendConfirmation
              recipients={recipients}
              subject={subject}
              messageTemplate={messageTemplate}
              onSend={handleSend}
              isSending={isSending}
              sendResult={sendResult}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < 3 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed[step]}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

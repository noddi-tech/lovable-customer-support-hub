import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, CheckCircle2, Mail, Inbox, ArrowRight, Pencil } from "lucide-react";
import { SetupTypeSelector, type SetupType } from "./wizard/SetupTypeSelector";
import { EmailConnectionStep } from "./wizard/EmailConnectionStep";
import { GoogleGroupSetupStep } from "./wizard/GoogleGroupSetupStep";
import { EmailForwardingSetupStep } from "./wizard/EmailForwardingSetupStep";
import { InboxAssignmentStep } from "./wizard/InboxAssignmentStep";
import { SetupSuccessStep } from "./wizard/SetupSuccessStep";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface EmailIntegrationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailIntegrationWizard({ open, onOpenChange }: EmailIntegrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupType, setSetupType] = useState<SetupType | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  
  // New state for SendGrid/Google Group flow
  const [publicEmail, setPublicEmail] = useState("");
  const [forwardingAddress, setForwardingAddress] = useState("");
  const [inboundRouteId, setInboundRouteId] = useState<string | null>(null);
  
  // Inbox assignment state
  const [assignmentMode, setAssignmentMode] = useState<'existing' | 'new' | 'skip'>('existing');
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [newInboxName, setNewInboxName] = useState("");
  const [newInboxDescription, setNewInboxDescription] = useState("");
  const [newInboxColor, setNewInboxColor] = useState("#3B82F6");
  const [newInboxDepartmentId, setNewInboxDepartmentId] = useState("no-department");
  const [newInboxSenderDisplayName, setNewInboxSenderDisplayName] = useState("");
  const [createdInboxId, setCreatedInboxId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch inboxes for displaying selected inbox name in confirmation
  const { data: inboxes } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as Array<{ id: string; name: string; color: string }>;
    }
  });

  const selectedInboxData = inboxes?.find(i => i.id === selectedInboxId);

  const getSetupTypeLabel = () => {
    switch (setupType) {
      case 'gmail': return 'Gmail OAuth';
      case 'google-group': return 'Google Group';
      case 'team-email': return 'Email Forwarding';
      default: return 'Unknown';
    }
  };

  const createInboxMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('inboxes')
        .insert({
          name: newInboxName,
          description: newInboxDescription || null,
          color: newInboxColor,
          department_id: newInboxDepartmentId === 'no-department' ? null : newInboxDepartmentId,
          organization_id: profile.organization_id,
          is_default: false,
          auto_assignment_rules: {},
          sender_display_name: newInboxSenderDisplayName || newInboxName,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCreatedInboxId(data.id);
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      toast.success('Inbox created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create inbox: ' + error.message);
    }
  });

  // Link inbound route to inbox
  const linkRouteToInbox = async (inboxId: string) => {
    if (!inboundRouteId) return;
    
    try {
      const { error } = await supabase
        .from('inbound_routes')
        .update({ inbox_id: inboxId })
        .eq('id', inboundRouteId);
      
      if (error) throw error;
      
      // Invalidate cache so InboxManagement shows updated data
      queryClient.invalidateQueries({ queryKey: ['inbound_routes'] });
    } catch (error: any) {
      console.error('Failed to link route to inbox:', error);
      toast.error('Failed to link email route to inbox');
    }
  };

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const canGoNext = () => {
    if (currentStep === 1) return setupType !== null;
    if (currentStep === 2) {
      if (setupType === 'gmail') return connectedEmail !== null;
      if (setupType === 'google-group' || setupType === 'team-email') {
        return inboundRouteId !== null;
      }
      return true;
    }
    if (currentStep === 3) {
      if (showConfirmation) return true; // Can always proceed from confirmation
      if (assignmentMode === 'existing') return selectedInboxId !== '';
      if (assignmentMode === 'new') return newInboxName.trim() !== '';
      return true; // skip
    }
    return true;
  };

  const handleNext = async () => {
    // Step 3: Show confirmation first, then create inbox and link route
    if (currentStep === 3) {
      if (!showConfirmation) {
        // First click: show confirmation
        setShowConfirmation(true);
        return;
      }
      
      // Second click: actually create inbox and link route
      let finalInboxId: string | null = null;
      
      if (assignmentMode === 'new') {
        const newInbox = await createInboxMutation.mutateAsync();
        finalInboxId = newInbox.id;
      } else if (assignmentMode === 'existing') {
        finalInboxId = selectedInboxId;
      }
      
      // Link the inbound route to the inbox
      if (finalInboxId && inboundRouteId) {
        await linkRouteToInbox(finalInboxId);
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && showConfirmation) {
      // Go back from confirmation to editing
      setShowConfirmation(false);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSetupType(null);
    setConnectedEmail(null);
    setPublicEmail("");
    setForwardingAddress("");
    setInboundRouteId(null);
    setAssignmentMode('existing');
    setSelectedInboxId('');
    setNewInboxName("");
    setNewInboxDescription("");
    setNewInboxColor("#3B82F6");
    setNewInboxDepartmentId("no-department");
    setNewInboxSenderDisplayName("");
    setCreatedInboxId(null);
    setShowConfirmation(false);
  };

  const handleGoToInbox = () => {
    const finalInboxId = createdInboxId || selectedInboxId;
    if (finalInboxId) {
      navigate(`/?inbox=${finalInboxId}`);
      onOpenChange(false);
      handleReset();
    }
  };

  const handleSetupAnother = () => {
    handleReset();
  };

  const renderConfirmationSummary = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-primary">
        <CheckCircle2 className="h-6 w-6" />
        <h3 className="text-lg font-semibold">Review Your Configuration</h3>
      </div>

      <div className="rounded-lg border bg-muted/30 p-5 space-y-4">
        {/* Integration Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Integration Type</span>
          <span className="font-medium">{getSetupTypeLabel()}</span>
        </div>

        <Separator />

        {/* Email Source */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="text-sm">Email Source</span>
          </div>
          <div className="text-right">
            {(publicEmail || connectedEmail) && (
              <div className="font-medium">{publicEmail || connectedEmail}</div>
            )}
            {forwardingAddress && (
              <div className="text-xs text-muted-foreground mt-1">
                Forwarding to: <code className="bg-muted px-1 rounded">{forwardingAddress}</code>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Destination Inbox */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Inbox className="h-4 w-4" />
            <span className="text-sm">Destination Inbox</span>
          </div>
          <div className="text-right">
            {assignmentMode === 'new' && (
              <div className="flex items-center gap-2 justify-end">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: newInboxColor }}
                />
                <span className="font-medium">{newInboxName}</span>
                <span className="text-xs text-muted-foreground">(new)</span>
              </div>
            )}
            {assignmentMode === 'existing' && selectedInboxData && (
              <div className="flex items-center gap-2 justify-end">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: selectedInboxData.color }}
                />
                <span className="font-medium">{selectedInboxData.name}</span>
              </div>
            )}
            {assignmentMode === 'skip' && (
              <span className="text-muted-foreground italic">Not assigned (configure later)</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowConfirmation(false)}
          className="text-muted-foreground"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit Configuration
        </Button>
      </div>
    </div>
  );

  const handleSetupComplete = () => {
    // Called when Google Group or Email Forwarding setup is done
    // Move to inbox assignment step
    setCurrentStep(3);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <SetupTypeSelector
            selectedType={setupType}
            onSelectType={setSetupType}
          />
        );
      case 2:
        if (setupType === 'gmail') {
          return (
            <EmailConnectionStep
              setupType={setupType}
              onEmailConnected={setConnectedEmail}
              onSkip={() => handleNext()}
            />
          );
        }
        if (setupType === 'google-group') {
          return (
            <GoogleGroupSetupStep
              publicEmail={publicEmail}
              forwardingAddress={forwardingAddress}
              onPublicEmailChange={setPublicEmail}
              onForwardingAddressGenerated={setForwardingAddress}
              onInboundRouteCreated={setInboundRouteId}
              onSetupComplete={handleSetupComplete}
            />
          );
        }
        if (setupType === 'team-email') {
          return (
            <EmailForwardingSetupStep
              publicEmail={publicEmail}
              forwardingAddress={forwardingAddress}
              onPublicEmailChange={setPublicEmail}
              onForwardingAddressGenerated={setForwardingAddress}
              onInboundRouteCreated={setInboundRouteId}
              onSetupComplete={handleSetupComplete}
            />
          );
        }
        return null;
      case 3:
        if (showConfirmation) {
          return renderConfirmationSummary();
        }
        return (
          <InboxAssignmentStep
            connectedEmail={publicEmail || connectedEmail || undefined}
            assignmentMode={assignmentMode}
            selectedInboxId={selectedInboxId}
            newInboxName={newInboxName}
            newInboxDescription={newInboxDescription}
            newInboxColor={newInboxColor}
            newInboxDepartmentId={newInboxDepartmentId}
            newInboxSenderDisplayName={newInboxSenderDisplayName}
            onAssignmentModeChange={setAssignmentMode}
            onSelectedInboxChange={setSelectedInboxId}
            onNewInboxNameChange={setNewInboxName}
            onNewInboxDescriptionChange={setNewInboxDescription}
            onNewInboxColorChange={setNewInboxColor}
            onNewInboxDepartmentChange={setNewInboxDepartmentId}
            onNewInboxSenderDisplayNameChange={setNewInboxSenderDisplayName}
          />
        );
      case 4:
        return (
          <SetupSuccessStep
            setupType={setupType!}
            connectedEmail={publicEmail || connectedEmail || undefined}
            forwardingAddress={forwardingAddress || undefined}
            assignmentMode={assignmentMode}
            inboxName={assignmentMode === 'new' ? newInboxName : undefined}
            inboxColor={assignmentMode === 'new' ? newInboxColor : undefined}
            onGoToInbox={handleGoToInbox}
            onSetupAnother={handleSetupAnother}
          />
        );
      default:
        return null;
    }
  };

  // For Google Group and Email Forwarding, step 2 has its own navigation
  const showDefaultNavigation = currentStep !== 2 || setupType === 'gmail';

  const getNextButtonLabel = () => {
    if (currentStep === 3) {
      if (showConfirmation) {
        return createInboxMutation.isPending ? 'Creating...' : 'Confirm & Create';
      }
      return 'Review & Finish';
    }
    return 'Next';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Email Integration</DialogTitle>
          <DialogDescription>
            Connect an email source and choose where to route incoming emails
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          {/* Navigation buttons - show only for steps with default navigation */}
          {currentStep < 4 && showDefaultNavigation && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canGoNext() || createInboxMutation.isPending}
              >
                {getNextButtonLabel()}
                {currentStep !== 3 && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          )}
          
          {/* Back button only for step 2 with custom flow */}
          {currentStep === 2 && !showDefaultNavigation && (
            <div className="flex items-center pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
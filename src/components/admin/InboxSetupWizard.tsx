import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SetupTypeSelector, type SetupType } from "./wizard/SetupTypeSelector";
import { InboxConfigForm } from "./wizard/InboxConfigForm";
import { EmailConnectionStep } from "./wizard/EmailConnectionStep";
import { SetupSuccessStep } from "./wizard/SetupSuccessStep";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface InboxSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InboxSetupWizard({ open, onOpenChange }: InboxSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupType, setSetupType] = useState<SetupType | null>(null);
  const [inboxName, setInboxName] = useState("");
  const [inboxDescription, setInboxDescription] = useState("");
  const [inboxColor, setInboxColor] = useState("#3B82F6");
  const [departmentId, setDepartmentId] = useState("no-department");
  const [createdInboxId, setCreatedInboxId] = useState<string | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
          name: inboxName,
          description: inboxDescription || null,
          color: inboxColor,
          department_id: departmentId === 'no-department' ? null : departmentId,
          organization_id: profile.organization_id,
          is_default: false,
          auto_assignment_rules: {},
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

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const canGoNext = () => {
    if (currentStep === 1) return setupType !== null;
    if (currentStep === 2) return inboxName.trim() !== '';
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      // Create inbox before moving to step 3
      await createInboxMutation.mutateAsync();
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSetupType(null);
    setInboxName("");
    setInboxDescription("");
    setInboxColor("#3B82F6");
    setDepartmentId("no-department");
    setCreatedInboxId(null);
    setConnectedEmail(null);
  };

  const handleGoToInbox = () => {
    if (createdInboxId) {
      navigate(`/?inbox=${createdInboxId}`);
      onOpenChange(false);
      handleReset();
    }
  };

  const handleSetupAnother = () => {
    handleReset();
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
        return (
          <InboxConfigForm
            name={inboxName}
            description={inboxDescription}
            color={inboxColor}
            departmentId={departmentId}
            onNameChange={setInboxName}
            onDescriptionChange={setInboxDescription}
            onColorChange={setInboxColor}
            onDepartmentChange={setDepartmentId}
          />
        );
      case 3:
        return setupType && createdInboxId ? (
          <EmailConnectionStep
            setupType={setupType}
            inboxId={createdInboxId}
            onGmailConnected={setConnectedEmail}
            onSkip={() => handleNext()}
          />
        ) : null;
      case 4:
        return (
          <SetupSuccessStep
            inboxName={inboxName}
            inboxColor={inboxColor}
            setupType={setupType!}
            connectedEmail={connectedEmail || undefined}
            onGoToInbox={handleGoToInbox}
            onSetupAnother={handleSetupAnother}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inbox</DialogTitle>
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

          {/* Navigation buttons */}
          {currentStep < 4 && (
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
                {currentStep === 2 && createInboxMutation.isPending ? (
                  'Creating...'
                ) : currentStep === totalSteps - 1 ? (
                  'Finish'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

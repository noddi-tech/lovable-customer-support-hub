import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface InboxAssignmentStepProps {
  connectedEmail?: string;
  assignmentMode: 'existing' | 'new' | 'skip';
  selectedInboxId: string;
  newInboxName: string;
  newInboxDescription: string;
  newInboxColor: string;
  newInboxDepartmentId: string;
  newInboxSenderDisplayName: string;
  onAssignmentModeChange: (mode: 'existing' | 'new' | 'skip') => void;
  onSelectedInboxChange: (inboxId: string) => void;
  onNewInboxNameChange: (name: string) => void;
  onNewInboxDescriptionChange: (description: string) => void;
  onNewInboxColorChange: (color: string) => void;
  onNewInboxDepartmentChange: (departmentId: string) => void;
  onNewInboxSenderDisplayNameChange: (name: string) => void;
}

const colorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
];

export function InboxAssignmentStep({
  connectedEmail,
  assignmentMode,
  selectedInboxId,
  newInboxName,
  newInboxDescription,
  newInboxColor,
  newInboxDepartmentId,
  newInboxSenderDisplayName,
  onAssignmentModeChange,
  onSelectedInboxChange,
  onNewInboxNameChange,
  onNewInboxDescriptionChange,
  onNewInboxColorChange,
  onNewInboxDepartmentChange,
  onNewInboxSenderDisplayNameChange,
}: InboxAssignmentStepProps) {
  
  // Auto-suggest sender display name based on inbox name
  useEffect(() => {
    if (assignmentMode === 'new' && newInboxName && !newInboxSenderDisplayName) {
      // Capitalize first letter of each word
      const suggested = newInboxName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      onNewInboxSenderDisplayNameChange(suggested);
    }
  }, [newInboxName, assignmentMode]);

  const { data: inboxes } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
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
        .select('id, name, color, is_active')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">📬 Where should emails go?</h3>
        <p className="text-sm text-muted-foreground">
          {connectedEmail 
            ? `Choose how to route emails from ${connectedEmail}`
            : 'Choose where to route emails from this integration'
          }
        </p>
      </div>

      <RadioGroup value={assignmentMode} onValueChange={(value) => onAssignmentModeChange(value as 'existing' | 'new' | 'skip')}>
        {/* Existing Inbox */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="existing" id="existing" />
            <Label htmlFor="existing" className="font-medium cursor-pointer">
              Assign to existing inbox
            </Label>
          </div>
          {assignmentMode === 'existing' && (
            <div className="ml-6 space-y-2">
              <Select value={selectedInboxId} onValueChange={onSelectedInboxChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select inbox..." />
                </SelectTrigger>
                <SelectContent>
                  {inboxes?.map((inbox) => (
                    <SelectItem key={inbox.id} value={inbox.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: inbox.color || '#3B82F6' }}
                        />
                        {inbox.name}
                      </div>
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Create New Inbox */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="new" id="new" />
            <Label htmlFor="new" className="font-medium cursor-pointer">
              Create a new inbox
            </Label>
          </div>
          {assignmentMode === 'new' && (
            <div className="ml-6 space-y-4">
              <div>
                <Label htmlFor="inbox-name">Inbox Name *</Label>
                <Input
                  id="inbox-name"
                  value={newInboxName}
                  onChange={(e) => onNewInboxNameChange(e.target.value)}
                  placeholder="e.g., Support, Sales, General"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="sender-display-name">Sender Display Name</Label>
                <Input
                  id="sender-display-name"
                  value={newInboxSenderDisplayName}
                  onChange={(e) => onNewInboxSenderDisplayNameChange(e.target.value)}
                  placeholder="e.g., Noddi Support"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How this inbox appears in email "From:" field (e.g., "Noddi Support" &lt;support@noddi.no&gt;)
                </p>
              </div>

              <div>
                <Label htmlFor="inbox-description">Description (optional)</Label>
                <Textarea
                  id="inbox-description"
                  value={newInboxDescription}
                  onChange={(e) => onNewInboxDescriptionChange(e.target.value)}
                  placeholder="What is this inbox for?"
                  className="mt-1.5"
                  rows={2}
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1.5">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => onNewInboxColorChange(color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newInboxColor === color.value
                          ? 'border-primary scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))
                  }
                </div>
              </div>

              <div>
                <Label htmlFor="department">Department (optional)</Label>
                <Select value={newInboxDepartmentId} onValueChange={onNewInboxDepartmentChange}>
                  <SelectTrigger id="department" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-department">No Department</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Skip */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip" className="font-medium cursor-pointer">
              Skip - I'll assign to an inbox later
            </Label>
          </div>
          {assignmentMode === 'skip' && (
            <Alert className="ml-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Emails won't sync until you assign this integration to an inbox in Admin → Integrations
              </AlertDescription>
            </Alert>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}

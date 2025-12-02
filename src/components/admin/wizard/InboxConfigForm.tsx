import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InboxConfigFormProps {
  name: string;
  description: string;
  color: string;
  departmentId: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
}

const colorOptions = [
  { value: '#3B82F6', label: '🔵 Blue' },
  { value: '#10B981', label: '🟢 Green' },
  { value: '#F59E0B', label: '🟡 Yellow' },
  { value: '#F97316', label: '🟠 Orange' },
  { value: '#EF4444', label: '🔴 Red' },
  { value: '#8B5CF6', label: '🟣 Purple' }
];

export function InboxConfigForm({
  name,
  description,
  color,
  departmentId,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onDepartmentChange
}: InboxConfigFormProps) {
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description');
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">📬 Create Your Inbox</h3>
        <p className="text-sm text-muted-foreground">
          Configure the basic settings for your new inbox
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="inbox-name">Inbox Name *</Label>
          <Input
            id="inbox-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Bedrift, Support, Rekruttering"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            💡 This name will appear in your sidebar
          </p>
        </div>

        <div>
          <Label htmlFor="inbox-description">Description (optional)</Label>
          <Textarea
            id="inbox-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="e.g., Business inquiries from bedrift@noddi.no"
            className="mt-1.5 resize-none"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="inbox-color">Color</Label>
          <div className="flex gap-2 mt-1.5">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onColorChange(option.value)}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  color === option.value
                    ? 'border-primary shadow-md scale-110'
                    : 'border-border hover:border-primary/50'
                }`}
                style={{ backgroundColor: option.value }}
                title={option.label}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="inbox-department">Department (optional)</Label>
          <Select value={departmentId} onValueChange={onDepartmentChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select department..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-department">No Department</SelectItem>
              {departments?.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

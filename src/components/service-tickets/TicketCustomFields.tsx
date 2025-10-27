import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TicketCustomFieldsProps {
  ticketId: string;
  customFields?: Record<string, any>;
}

export function TicketCustomFields({ ticketId, customFields = {} }: TicketCustomFieldsProps) {
  const [fields, setFields] = useState<Record<string, any>>(customFields);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (updatedFields: Record<string, any>) => {
      const { error } = await supabase
        .from('service_tickets' as any)
        .update({ custom_fields: updatedFields })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
      toast.success('Custom fields updated');
    },
    onError: (error) => {
      toast.error('Failed to update custom fields: ' + error.message);
    },
  });

  const handleAddField = () => {
    if (newFieldKey.trim() && newFieldValue.trim()) {
      const updatedFields = { ...fields, [newFieldKey.trim()]: newFieldValue.trim() };
      setFields(updatedFields);
      saveMutation.mutate(updatedFields);
      setNewFieldKey('');
      setNewFieldValue('');
      setIsAdding(false);
    }
  };

  const handleRemoveField = (key: string) => {
    const updatedFields = { ...fields };
    delete updatedFields[key];
    setFields(updatedFields);
    saveMutation.mutate(updatedFields);
  };

  const handleUpdateField = (key: string, value: string) => {
    const updatedFields = { ...fields, [key]: value };
    setFields(updatedFields);
  };

  const handleSaveField = (key: string) => {
    saveMutation.mutate(fields);
  };

  const fieldEntries = Object.entries(fields);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Custom Fields</CardTitle>
          {!isAdding && (
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fieldEntries.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No custom fields yet. Click + to add one.
          </p>
        )}

        {fieldEntries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">{key}</Label>
              <div className="flex gap-2">
                <Input
                  value={value}
                  onChange={(e) => handleUpdateField(key, e.target.value)}
                  className="h-8"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveField(key)}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveField(key)}
                  disabled={saveMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {isAdding && (
          <div className="space-y-2 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-xs">Field Name</Label>
              <Input
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                placeholder="e.g., Vehicle VIN"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Field Value</Label>
              <Input
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                placeholder="Enter value"
                className="h-8"
                onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewFieldKey('');
                  setNewFieldValue('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddField}
                disabled={!newFieldKey.trim() || !newFieldValue.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Field
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

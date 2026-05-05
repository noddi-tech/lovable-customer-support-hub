import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationStore } from '@/stores/organizationStore';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useCreateFollowup } from '@/hooks/recruitment/useFollowups';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicationId?: string | null;
}

function defaultDate(): string {
  // tomorrow 09:00 Oslo
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  // Format as datetime-local (yyyy-MM-ddTHH:mm)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T09:00`;
}

export default function ScheduleFollowupDialog({ open, onOpenChange, applicantId, applicationId }: Props) {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationStore();
  const { data: team } = useTeamMembers();
  const create = useCreateFollowup();

  const [when, setWhen] = useState(defaultDate());
  const [note, setNote] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('me');
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentOrganizationId) return;
    supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', currentOrganizationId)
      .maybeSingle()
      .then(({ data }) => setMyProfileId(data?.id ?? null));
  }, [user, currentOrganizationId]);

  useEffect(() => {
    if (open) {
      setWhen(defaultDate());
      setNote('');
      setAssignedTo('me');
    }
  }, [open]);

  const handleSave = async () => {
    const iso = new Date(when).toISOString();
    const assignee = assignedTo === 'me' ? myProfileId : assignedTo;
    await create.mutateAsync({
      applicant_id: applicantId,
      application_id: applicationId ?? null,
      scheduled_for: iso,
      note: note.trim() || null,
      assigned_to: assignee,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Påminn meg</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fu-when">Tidspunkt</Label>
            <Input
              id="fu-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fu-note">Notat (valgfritt)</Label>
            <Textarea
              id="fu-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hva skal du følge opp?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Tildelt til</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Meg</SelectItem>
                {(team ?? []).filter((m) => m.id !== myProfileId).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={handleSave} disabled={create.isPending}>Lagre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

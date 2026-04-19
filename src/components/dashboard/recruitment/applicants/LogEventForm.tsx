import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useAddApplicantNote, useLogApplicantEvent } from './useApplicantProfile';

interface Props {
  applicantId: string;
  applicationId: string | null;
  onDone: () => void;
}

type EventType = 'phone_call' | 'interview_scheduled' | 'interview_completed' | 'other';

const LogEventForm: React.FC<Props> = ({ applicantId, applicationId, onDone }) => {
  const [type, setType] = useState<EventType>('phone_call');
  const [duration, setDuration] = useState('');
  const [outcome, setOutcome] = useState('interested');
  const [interviewType, setInterviewType] = useState('phone');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');

  const logMut = useLogApplicantEvent();
  const noteMut = useAddApplicantNote();

  const pending = logMut.isPending || noteMut.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId && type !== 'other') {
      // Need an application to attach to
      return;
    }
    try {
      if (type === 'other') {
        if (!notes.trim()) return;
        await noteMut.mutateAsync({
          applicantId,
          applicationId,
          content: notes.trim(),
          note_type: 'internal',
        });
      } else if (type === 'phone_call') {
        await logMut.mutateAsync({
          applicantId,
          applicationId: applicationId!,
          event_type: 'phone_call',
          event_data: {
            duration_minutes: duration ? Number(duration) : null,
            outcome,
          },
          notes: notes.trim() || null,
        });
      } else if (type === 'interview_scheduled') {
        await logMut.mutateAsync({
          applicantId,
          applicationId: applicationId!,
          event_type: 'interview_scheduled',
          event_data: {
            interview_type: interviewType,
            scheduled_at: scheduledAt || null,
            location: location.trim() || null,
          },
        });
      } else if (type === 'interview_completed') {
        await logMut.mutateAsync({
          applicantId,
          applicationId: applicationId!,
          event_type: 'interview_completed',
          event_data: {
            interview_type: interviewType,
            rating: rating ? Number(rating) : null,
          },
          notes: notes.trim() || null,
        });
      }
      onDone();
    } catch {
      // toasts handled in hooks
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 w-80">
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as EventType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone_call">Telefonsamtale</SelectItem>
            <SelectItem value="interview_scheduled">Intervju planlagt</SelectItem>
            <SelectItem value="interview_completed">Intervju gjennomført</SelectItem>
            <SelectItem value="other">Annet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === 'phone_call' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Varighet (min)</Label>
            <Input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Utfall</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interested">Interessert</SelectItem>
                <SelectItem value="no_answer">Ikke svar</SelectItem>
                <SelectItem value="not_interested">Ikke interessert</SelectItem>
                <SelectItem value="callback">Ring tilbake</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {type === 'interview_scheduled' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Telefon</SelectItem>
                <SelectItem value="onsite">Oppmøte</SelectItem>
                <SelectItem value="trial_day">Prøvedag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dato og tid</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sted</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </>
      )}

      {type === 'interview_completed' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Telefon</SelectItem>
                <SelectItem value="onsite">Oppmøte</SelectItem>
                <SelectItem value="trial_day">Prøvedag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vurdering (1-5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notater</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              emojiAutocomplete={false}
              rows={3}
            />
          </div>
        </>
      )}

      {type === 'other' && (
        <div className="space-y-1">
          <Label className="text-xs">Notat</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            emojiAutocomplete={false}
            rows={4}
            required
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onDone} disabled={pending}>
          Avbryt
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Lagre
        </Button>
      </div>
    </form>
  );
};

export default LogEventForm;

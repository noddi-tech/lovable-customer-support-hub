import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Loader2, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAddApplicantNote, useApplicantNotes } from './useApplicantProfile';

interface Props {
  applicantId: string;
  applicationId: string | null;
}

const NOTE_TYPES: { value: string; label: string }[] = [
  { value: 'internal', label: 'Internt notat' },
  { value: 'interview_feedback', label: 'Intervjufeedback' },
  { value: 'private', label: 'Privat' },
];

const NOTE_TYPE_LABEL: Record<string, string> = NOTE_TYPES.reduce(
  (acc, n) => ({ ...acc, [n.value]: n.label }),
  {} as Record<string, string>
);

const ApplicantNotesTab: React.FC<Props> = ({ applicantId, applicationId }) => {
  const { data: notes, isLoading } = useApplicantNotes(applicantId);
  const addMut = useAddApplicantNote();
  const [content, setContent] = useState('');
  const [type, setType] = useState('internal');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await addMut.mutateAsync({
        applicantId,
        applicationId,
        content: content.trim(),
        note_type: type,
      });
      setContent('');
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv et notat..."
              emojiAutocomplete={false}
              rows={3}
            />
            <div className="flex items-center gap-2 justify-end">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={!content.trim() || addMut.isPending}>
                {addMut.isPending && <Loader2 className="animate-spin" />}
                Legg til
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <div className="border rounded-md p-12 flex flex-col items-center justify-center text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ingen notater ennå</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {note.profiles?.full_name ?? 'Ukjent'}
                    </span>
                    <Badge
                      className={cn(
                        'border-transparent',
                        note.note_type === 'interview_feedback'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {NOTE_TYPE_LABEL[note.note_type] ?? note.note_type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), {
                      addSuffix: true,
                      locale: nb,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicantNotesTab;

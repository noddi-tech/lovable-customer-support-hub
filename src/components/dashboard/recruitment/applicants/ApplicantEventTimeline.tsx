import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  ArrowRight,
  BarChart,
  Calendar,
  CheckCircle,
  Mail,
  MailOpen,
  MessageSquare,
  Paperclip,
  Phone,
  Smartphone,
  UserCheck,
  UserPlus,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApplicantEvent } from './useApplicantProfile';
import type { PipelineStage } from './useApplicants';

interface Props {
  events: ApplicantEvent[];
  pipeline: { stages: PipelineStage[] } | null | undefined;
}

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: 'Meta',
  finn: 'Finn.no',
  website: 'Nettside',
  referral: 'Referanse',
  manual: 'Manuell',
  csv_import: 'CSV',
};

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  phone: 'Telefon',
  onsite: 'Oppmøte',
  trial_day: 'Prøvedag',
};

const PHONE_OUTCOME_LABELS: Record<string, string> = {
  interested: 'Interessert',
  no_answer: 'Ikke svar',
  not_interested: 'Ikke interessert',
  callback: 'Ring tilbake',
};

const EVENT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
> = {
  created: { icon: UserPlus, bg: 'bg-blue-100', text: 'text-blue-600' },
  stage_change: { icon: ArrowRight, bg: 'bg-purple-100', text: 'text-purple-600' },
  note_added: { icon: MessageSquare, bg: 'bg-muted', text: 'text-muted-foreground' },
  email_sent: { icon: Mail, bg: 'bg-green-100', text: 'text-green-600' },
  email_received: { icon: MailOpen, bg: 'bg-blue-100', text: 'text-blue-600' },
  phone_call: { icon: Phone, bg: 'bg-orange-100', text: 'text-orange-600' },
  interview_scheduled: { icon: Calendar, bg: 'bg-indigo-100', text: 'text-indigo-600' },
  interview_completed: { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600' },
  file_uploaded: { icon: Paperclip, bg: 'bg-muted', text: 'text-muted-foreground' },
  assigned: { icon: UserCheck, bg: 'bg-teal-100', text: 'text-teal-600' },
  sms_sent: { icon: Smartphone, bg: 'bg-yellow-100', text: 'text-yellow-700' },
  score_calculated: { icon: BarChart, bg: 'bg-purple-100', text: 'text-purple-600' },
};

function stageName(id: string | undefined, pipeline: Props['pipeline']): string {
  if (!id) return '—';
  const stage = pipeline?.stages.find((s) => s.id === id);
  return stage?.name ?? id;
}

function describeEvent(event: ApplicantEvent, pipeline: Props['pipeline']): string {
  const d = event.event_data ?? {};
  switch (event.event_type) {
    case 'created':
      return `Søker opprettet (kilde: ${SOURCE_LABELS[d.source] ?? d.source ?? '—'})`;
    case 'stage_change':
      return `Flyttet fra ${stageName(d.from, pipeline)} til ${stageName(d.to, pipeline)}`;
    case 'note_added':
      return `Notat lagt til${d.preview ? `: ${d.preview}` : ''}`;
    case 'email_sent':
      return `E-post sendt${d.subject ? `: ${d.subject}` : ''}`;
    case 'email_received':
      return `E-post mottatt${d.subject ? `: ${d.subject}` : ''}`;
    case 'phone_call': {
      const parts = ['Telefonsamtale'];
      if (d.duration_minutes != null) parts.push(`${d.duration_minutes} min`);
      if (d.outcome) parts.push(PHONE_OUTCOME_LABELS[d.outcome] ?? d.outcome);
      return parts.join(' — ');
    }
    case 'interview_scheduled': {
      const type = INTERVIEW_TYPE_LABELS[d.interview_type] ?? d.interview_type ?? '';
      const when = d.scheduled_at
        ? format(new Date(d.scheduled_at), "d. MMM yyyy 'kl' HH:mm", { locale: nb })
        : '';
      const where = d.location ? ` — ${d.location}` : '';
      return `Intervju planlagt: ${type} ${when}${where}`.trim();
    }
    case 'interview_completed': {
      const type = INTERVIEW_TYPE_LABELS[d.interview_type] ?? d.interview_type ?? '';
      const rating = d.rating != null ? ` — Vurdering: ${d.rating}/5` : '';
      return `Intervju gjennomført: ${type}${rating}`;
    }
    case 'file_uploaded':
      return `Fil lastet opp${d.file_name ? `: ${d.file_name}` : ''}`;
    case 'assigned':
      return `Tilordnet til ${d.name ?? '—'}`;
    case 'sms_sent':
      return `SMS sendt${d.preview ? `: ${d.preview}` : ''}`;
    case 'score_calculated':
      return `Poengsum beregnet${d.score != null ? `: ${d.score}` : ''}`;
    default:
      return event.event_type;
  }
}

const ApplicantEventTimeline: React.FC<Props> = ({ events, pipeline }) => {
  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 text-sm text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        Ingen hendelser ennå
      </div>
    );
  }
  return (
    <ol className="relative space-y-4">
      {events.map((event, idx) => {
        const cfg = EVENT_CONFIG[event.event_type] ?? {
          icon: Activity,
          bg: 'bg-muted',
          text: 'text-muted-foreground',
        };
        const Icon = cfg.icon;
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3">
            {!isLast && (
              <span
                className="absolute left-4 top-8 -bottom-4 w-px bg-border"
                aria-hidden="true"
              />
            )}
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                cfg.bg
              )}
            >
              <Icon className={cn('h-4 w-4', cfg.text)} />
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-sm text-foreground">{describeEvent(event, pipeline)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {event.profiles?.full_name ?? 'System'}
                {' · '}
                {formatDistanceToNow(new Date(event.created_at), {
                  addSuffix: true,
                  locale: nb,
                })}
              </p>
              {event.notes && (
                <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded whitespace-pre-wrap">
                  {event.notes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ApplicantEventTimeline;

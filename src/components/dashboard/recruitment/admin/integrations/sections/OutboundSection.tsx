import { ComingSoonCard } from '../cards/ComingSoonCard';
import { MessageSquare, Users, Calendar, Briefcase } from 'lucide-react';

export function OutboundSection() {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Utgående
        </h3>
        <p className="text-xs text-muted-foreground">
          Send varsler og synkroniser data til andre verktøy.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ComingSoonCard
          title="Slack-varsler"
          description="Send varsler til Slack når nye søkere registreres eller fases endres."
          icon={MessageSquare}
        />
        <ComingSoonCard
          title="Microsoft Teams-varsler"
          description="Send rekrutteringsvarsler til Teams-kanaler."
          icon={Users}
        />
        <ComingSoonCard
          title="Kalender-synkronisering"
          description="Synkroniser intervjuer med Google Calendar eller Outlook."
          icon={Calendar}
        />
        <ComingSoonCard
          title="ATS-eksport"
          description="Eksporter søkere til Greenhouse, Workable og andre ATS-systemer."
          icon={Briefcase}
        />
      </div>
    </section>
  );
}

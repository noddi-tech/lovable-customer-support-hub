import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, Briefcase, UserCog } from 'lucide-react';

interface Props {
  onNext: () => void;
  onCancel: () => void;
}

export function Step1Prerequisites({ onNext, onCancel }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Før vi starter, sjekk at du har følgende på plass. Du logger inn med din egen
        Facebook-konto i neste steg.
      </p>

      <ul className="space-y-2">
        {[
          {
            icon: UserCog,
            title: 'Du er administrator av Facebook-siden',
            desc: 'Du må ha full admin-rolle på Meta-siden i Meta Business Suite.',
          },
          {
            icon: Briefcase,
            title: 'Lead Ads er aktivert på siden',
            desc: 'Sidens annonsekonto må kunne kjøre Lead Ad-kampanjer.',
          },
          {
            icon: ShieldCheck,
            title: 'Du er klar til å gi tilgang',
            desc: 'Vi ber om 5 tilganger som lar oss motta søkere automatisk via webhook.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3 rounded-md border p-3">
            <div className="rounded-md border bg-muted/50 p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-medium leading-tight">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1.5" />
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button onClick={onNext}>Fortsett</Button>
      </div>
    </div>
  );
}

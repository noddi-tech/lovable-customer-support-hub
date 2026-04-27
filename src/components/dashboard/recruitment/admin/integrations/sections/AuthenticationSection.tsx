import { ComingSoonCard } from '../cards/ComingSoonCard';
import { KeyRound, Shield } from 'lucide-react';

export function AuthenticationSection() {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Autentisering
        </h3>
        <p className="text-xs text-muted-foreground">
          Single Sign-On og identitetsleverandører.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ComingSoonCard
          title="Google Workspace SSO"
          description="La ansatte logge inn med Google Workspace-kontoen sin."
          icon={KeyRound}
        />
        <ComingSoonCard
          title="Microsoft Entra ID SSO"
          description="Single Sign-On via Microsoft Entra ID (tidligere Azure AD)."
          icon={Shield}
        />
      </div>
    </section>
  );
}

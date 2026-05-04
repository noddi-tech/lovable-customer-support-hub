import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, ShieldCheck, Facebook } from 'lucide-react';

export function MetaTokenHelpCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hva gjør jeg når Meta-tokenet utløper?</CardTitle>
        <CardDescription>
          Tre måter å fornye et utløpt eller utløpende Meta Page Access Token.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-3 rounded-md border p-3">
          <Facebook className="mt-0.5 h-4 w-4 text-blue-600" />
          <div>
            <div className="font-medium">1. OAuth-flyt</div>
            <p className="text-xs text-muted-foreground">
              Logg inn med Facebook og velg siden på nytt. Raskest, men virker ikke for sider
              som er blokkert av NPE.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border p-3">
          <KeyRound className="mt-0.5 h-4 w-4 text-amber-600" />
          <div>
            <div className="font-medium">2. Manuell oppsett</div>
            <p className="text-xs text-muted-foreground">
              Lim inn App Secret + et kortvarig brukertoken fra Graph Explorer. Vi utveksler
              automatisk til et langvarig side-token (utløper aldri).
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
          <div>
            <div className="font-medium">3. System User-token</div>
            <p className="text-xs text-muted-foreground">
              Permanent token administrert i Meta Business Manager. Anbefalt for produksjon —
              krever Business Manager-tilgang.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

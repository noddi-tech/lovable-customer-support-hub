import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function ComingSoonCard({ title, description, icon: Icon }: Props) {
  return (
    <Card className="opacity-80">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon ? (
              <div className="rounded-md border bg-muted/40 p-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : null}
            <div className="space-y-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Kommer snart</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Button size="sm" variant="outline" disabled>
          Ikke tilgjengelig ennå
        </Button>
      </CardContent>
    </Card>
  );
}

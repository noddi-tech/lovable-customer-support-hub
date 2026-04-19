import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface Props {
  current: number;
  total: number;
}

const ImportProgressStep: React.FC<Props> = ({ current, total }) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-md p-8 space-y-5">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-medium">Importerer søkere…</p>
            <p className="text-sm text-muted-foreground">
              Ikke lukk denne siden mens import pågår.
            </p>
          </div>
        </div>
        <Progress value={pct} />
        <p className="text-sm text-center text-muted-foreground">
          {current} / {total} ({pct}%)
        </p>
      </Card>
    </div>
  );
};

export default ImportProgressStep;

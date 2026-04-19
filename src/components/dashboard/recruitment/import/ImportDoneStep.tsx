import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ImportResult } from './useImport';

interface Props {
  result: ImportResult;
  onRestart: () => void;
}

const ImportDoneStep: React.FC<Props> = ({ result, onRestart }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold">Import fullført!</h3>
          <p className="text-sm text-muted-foreground">
            Søkerne er nå tilgjengelige i pipeline.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-4 text-center bg-emerald-500/5 border-emerald-500/30">
            <div className="text-2xl font-semibold text-emerald-600">{result.imported}</div>
            <div className="text-xs text-muted-foreground mt-1">Importert</div>
          </div>
          <div className="rounded-lg border p-4 text-center bg-amber-500/5 border-amber-500/30">
            <div className="text-2xl font-semibold text-amber-600">{result.duplicates}</div>
            <div className="text-xs text-muted-foreground mt-1">Duplikater</div>
          </div>
          <div className="rounded-lg border p-4 text-center bg-destructive/5 border-destructive/30">
            <div className="text-2xl font-semibold text-destructive">
              {result.errors.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Feil</div>
          </div>
        </div>

        {result.errors.length > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Vis feil ({result.errors.length})</span>
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md border max-h-64 overflow-auto divide-y">
                {result.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-sm">
                    <span className="font-medium">Rad {e.row}:</span>{' '}
                    <span className="text-muted-foreground">{e.reason}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onRestart}>
            Importer flere
          </Button>
          <Button onClick={() => navigate('/operations/recruitment/pipeline')}>
            Se søkere i pipeline
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ImportDoneStep;

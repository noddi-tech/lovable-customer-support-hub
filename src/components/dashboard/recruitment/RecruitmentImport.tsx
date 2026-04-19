import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import ImportUploadStep from './import/ImportUploadStep';
import ImportMappingStep from './import/ImportMappingStep';
import ImportConfigureStep from './import/ImportConfigureStep';
import ImportProgressStep from './import/ImportProgressStep';
import ImportDoneStep from './import/ImportDoneStep';
import { isValidEmail, mapRow, type TargetField } from './import/parseFile';
import { useBulkCreateApplicants, type ImportResult } from './import/useImport';

type Step = 'upload' | 'map' | 'configure' | 'importing' | 'done';

const STEP_LABELS: Record<Step, string> = {
  upload: '1. Last opp',
  map: '2. Koble kolonner',
  configure: '3. Konfigurer',
  importing: '4. Importerer',
  done: '5. Fullført',
};

const STEP_ORDER: Step[] = ['upload', 'map', 'configure', 'importing', 'done'];

const RecruitmentImport: React.FC = () => {
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, TargetField>>({});
  const [positionId, setPositionId] = useState<string>('');
  const [source, setSource] = useState<string>('Meta Lead Ad');
  const [gdprConfirmed, setGdprConfirmed] = useState<boolean>(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const importStartedRef = useRef(false);

  const bulkMut = useBulkCreateApplicants();

  const mappedRows = useMemo(
    () => rows.map((r) => mapRow(r, mapping)),
    [rows, mapping]
  );
  const validRows = useMemo(
    () => mappedRows.filter((r) => isValidEmail(r.email)),
    [mappedRows]
  );

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setPositionId('');
    setSource('Meta Lead Ad');
    setGdprConfirmed(true);
    setProgress({ current: 0, total: 0 });
    setResult(null);
    importStartedRef.current = false;
  };

  const startImport = () => {
    setProgress({ current: 0, total: validRows.length });
    setStep('importing');
  };

  useEffect(() => {
    if (step !== 'importing' || importStartedRef.current) return;
    importStartedRef.current = true;
    bulkMut
      .mutateAsync({
        rows: validRows,
        position_id: positionId,
        source,
        gdprConfirmed,
        onProgress: (current, total) => setProgress({ current, total }),
      })
      .then((res) => {
        setResult(res);
        setStep('done');
      })
      .catch((err: any) => {
        toast.error(err?.message || 'Import feilet');
        setStep('configure');
        importStartedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Importer søkere</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importer søkere fra CSV-fil (Meta Lead Ads, Finn.no, eller andre kilder).
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {STEP_ORDER.map((s, i) => {
          const active = s === step;
          const completed = STEP_ORDER.indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              <span
                className={`px-2.5 py-1 rounded-md font-medium ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : completed
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < STEP_ORDER.length - 1 && (
                <span className="text-muted-foreground">›</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {step === 'upload' && (
        <ImportUploadStep
          onParsed={({ headers, rows, mapping, detectedMeta }) => {
            setHeaders(headers);
            setRows(rows);
            setMapping(mapping);
            if (detectedMeta) setSource('Meta Lead Ad');
            setStep('map');
          }}
        />
      )}

      {step === 'map' && (
        <ImportMappingStep
          headers={headers}
          rows={rows}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={() => setStep('upload')}
          onNext={() => setStep('configure')}
        />
      )}

      {step === 'configure' && (
        <ImportConfigureStep
          validCount={validRows.length}
          positionId={positionId}
          source={source}
          gdprConfirmed={gdprConfirmed}
          onPositionChange={setPositionId}
          onSourceChange={setSource}
          onGdprChange={setGdprConfirmed}
          onBack={() => setStep('map')}
          onImport={startImport}
        />
      )}

      {step === 'importing' && (
        <ImportProgressStep current={progress.current} total={progress.total} />
      )}

      {step === 'done' && result && <ImportDoneStep result={result} onRestart={reset} />}
    </div>
  );
};

export default RecruitmentImport;

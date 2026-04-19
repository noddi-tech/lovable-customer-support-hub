import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { parseFile, autoDetectMapping, type TargetField } from './parseFile';

interface Props {
  onParsed: (data: {
    headers: string[];
    rows: Record<string, string>[];
    mapping: Record<string, TargetField>;
    detectedMeta: boolean;
  }) => void;
}

const ImportUploadStep: React.FC<Props> = ({ onParsed }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const { headers, rows } = await parseFile(file);
      if (rows.length === 0) {
        toast.error('Filen inneholder ingen rader');
        return;
      }
      const mapping = autoDetectMapping(headers);
      const detectedMeta = Object.values(mapping).includes('full_name');
      onParsed({ headers, rows, mapping, detectedMeta });
    } catch (err: any) {
      toast.error(err?.message || 'Kunne ikke lese filen');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <Card
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed py-16 cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium">
            {parsing ? 'Leser filen…' : 'Dra CSV-fil hit eller klikk for å velge'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Støtter .csv, .tsv og .xlsx filer
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </Card>

      <Card className="bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Slik eksporterer du fra Meta Lead Ads:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Gå til Meta Business Suite → Lead Ads Forms</li>
              <li>Velg skjema → Download Leads (CSV)</li>
              <li>Last opp filen her</li>
            </ol>
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Søkere som allerede finnes (samme e-post) hoppes automatisk over. Du får en oversikt
          før import starter.
        </p>
      </div>
    </div>
  );
};

export default ImportUploadStep;

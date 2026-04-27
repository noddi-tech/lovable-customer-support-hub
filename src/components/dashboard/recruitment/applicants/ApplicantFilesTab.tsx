import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Download, FileText, Loader2, MoreVertical, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  useApplicantFiles,
  useUploadApplicantFile,
  type ApplicantFile,
} from './useApplicantProfile';
import ReclassifyFileDialog from './files/ReclassifyFileDialog';
import DeleteFileConfirmDialog from './files/DeleteFileConfirmDialog';

interface Props {
  applicantId: string;
  applicationId: string | null;
}

const FILE_TYPES: { value: string; label: string }[] = [
  { value: 'resume', label: 'CV' },
  { value: 'cover_letter', label: 'Søknadsbrev' },
  { value: 'drivers_license', label: 'Førerkort' },
  { value: 'certification', label: 'Sertifikat' },
  { value: 'id_document', label: 'ID-dokument' },
  { value: 'other', label: 'Annet' },
];

const FILE_TYPE_LABEL: Record<string, string> = FILE_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>
);

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const ApplicantFilesTab: React.FC<Props> = ({ applicantId, applicationId }) => {
  const { data: files, isLoading } = useApplicantFiles(applicantId);
  const uploadMut = useUploadApplicantFile();
  const { data: team } = useTeamMembers();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState('resume');
  const [dragOver, setDragOver] = useState(false);
  const [reclassifyFile, setReclassifyFile] = useState<ApplicantFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<ApplicantFile | null>(null);

  const teamMap = new Map((team ?? []).map((m) => [m.id, m.full_name]));

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    for (const file of Array.from(list)) {
      try {
        await uploadMut.mutateAsync({
          applicantId,
          applicationId,
          file,
          file_type: fileType,
        });
      } catch {
        // toast handled in hook
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const download = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from('applicant-files')
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error('Kunne ikke åpne fil');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-xs">Filtype</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              'border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50'
            )}
          >
            {uploadMut.isPending ? (
              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              Dra filer hit eller klikk for å laste opp
            </p>
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !files || files.length === 0 ? (
        <div className="border rounded-md p-12 flex flex-col items-center justify-center text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ingen filer lastet opp</p>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {files.map((f) => (
            <div key={f.id} className="group flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.file_size)}
                  {f.uploaded_by && teamMap.get(f.uploaded_by) && (
                    <> · {teamMap.get(f.uploaded_by)}</>
                  )}
                  {' · '}
                  {format(new Date(f.created_at), 'd. MMM yyyy', { locale: nb })}
                </p>
              </div>
              <Badge variant="secondary">{FILE_TYPE_LABEL[f.file_type] ?? f.file_type}</Badge>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Handlinger" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => download(f.storage_path)}>
                    <Download className="h-4 w-4 mr-2" />
                    Last ned
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setReclassifyFile(f)}>
                    Endre type
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDeleteFile(f)}
                    className="text-destructive focus:text-destructive"
                  >
                    Slett
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <ReclassifyFileDialog
        open={!!reclassifyFile}
        onOpenChange={(o) => {
          if (!o) setReclassifyFile(null);
        }}
        applicantId={applicantId}
        file={reclassifyFile}
      />
      <DeleteFileConfirmDialog
        open={!!deleteFile}
        onOpenChange={(o) => {
          if (!o) setDeleteFile(null);
        }}
        applicantId={applicantId}
        applicationId={applicationId}
        file={deleteFile}
      />
    </div>
  );
};

export default ApplicantFilesTab;

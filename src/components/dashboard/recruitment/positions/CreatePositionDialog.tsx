import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateJobPosition, useRecruitmentPipelines } from './usePositions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LICENSE_CLASSES = ['B', 'B96', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'];

const EMPLOYMENT_TYPES: { value: string; label: string }[] = [
  { value: 'full_time', label: 'Heltid' },
  { value: 'part_time', label: 'Deltid' },
  { value: 'contract', label: 'Vikariat' },
  { value: 'seasonal', label: 'Sesong' },
];

const CreatePositionDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const createMut = useCreateJobPosition();
  const { data: pipelines } = useRecruitmentPipelines();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [campaign, setCampaign] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [licenseClasses, setLicenseClasses] = useState<Set<string>>(new Set());
  const [minYears, setMinYears] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');
  const [pipelineId, setPipelineId] = useState<string>('');

  // Pre-select default pipeline once
  useEffect(() => {
    if (!pipelineId && pipelines && pipelines.length > 0) {
      const def = pipelines.find((p) => p.is_default) ?? pipelines[0];
      if (def) setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setCampaign('');
    setEmploymentType('full_time');
    setMinSalary('');
    setMaxSalary('');
    setLicenseClasses(new Set());
    setMinYears('');
    setCertifications([]);
    setCertInput('');
    setPipelineId('');
  };

  const toggleLicense = (cls: string) => {
    setLicenseClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  const addCert = () => {
    const v = certInput.trim();
    if (!v) return;
    if (!certifications.includes(v)) {
      setCertifications([...certifications, v]);
    }
    setCertInput('');
  };

  const removeCert = (cert: string) => {
    setCertifications(certifications.filter((c) => c !== cert));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createMut.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        campaign: campaign.trim() || null,
        employment_type: employmentType,
        salary_range_min: minSalary ? Number(minSalary) : null,
        salary_range_max: maxSalary ? Number(maxSalary) : null,
        pipeline_id: pipelineId || null,
        requirements: {
          drivers_license: Array.from(licenseClasses),
          min_experience_years: minYears ? Number(minYears) : null,
          certifications,
        },
      });
      reset();
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opprett stilling</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Tittel <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Dekktekniker Oslo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv stillingen, arbeidsoppgaver, og hva dere ser etter..."
              emojiAutocomplete={false}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Sted</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="F.eks. Oslo, Bergen, Trondheim"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign">Kampanje</Label>
              <Input
                id="campaign"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="F.eks. Vår/Sommer 2026"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ansettelsestype</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lønnsspenn</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  min={0}
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="Min"
                />
                <p className="text-xs text-muted-foreground mt-1">NOK/år</p>
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="Max"
                />
                <p className="text-xs text-muted-foreground mt-1">NOK/år</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm">Krav</h4>

            <div className="space-y-2">
              <Label>Førerkortklasser</Label>
              <div className="grid grid-cols-4 gap-2">
                {LICENSE_CLASSES.map((cls) => (
                  <label
                    key={cls}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={licenseClasses.has(cls)}
                      onCheckedChange={() => toggleLicense(cls)}
                    />
                    <span>{cls}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-years">Minimum års erfaring</Label>
              <Input
                id="min-years"
                type="number"
                min={0}
                value={minYears}
                onChange={(e) => setMinYears(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-input">Sertifiseringer</Label>
              <Input
                id="cert-input"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCert();
                  }
                }}
                placeholder="F.eks. ADR — trykk Enter for å legge til"
              />
              {certifications.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {certifications.map((cert) => (
                    <Badge key={cert} variant="secondary" className="gap-1">
                      {cert}
                      <button
                        type="button"
                        onClick={() => removeCert(cert)}
                        className="hover:text-destructive"
                        aria-label={`Fjern ${cert}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pipeline</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg pipeline" />
              </SelectTrigger>
              <SelectContent>
                {(pipelines ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.is_default ? ' (standard)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMut.isPending}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={!title.trim() || createMut.isPending}>
              {createMut.isPending && <Loader2 className="animate-spin" />}
              Opprett stilling
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePositionDialog;

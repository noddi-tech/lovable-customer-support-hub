import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobPositions } from '../positions/usePositions';
import { useCreateApplicant } from './useApplicants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LICENSE_CLASSES = ['B', 'B96', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'manual', label: 'Manuell' },
  { value: 'referral', label: 'Referanse' },
  { value: 'website', label: 'Nettside' },
  { value: 'finn', label: 'Finn.no' },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'native', label: 'Morsmål' },
  { value: 'fluent', label: 'Flytende' },
  { value: 'conversational', label: 'Grunnleggende' },
  { value: 'basic', label: 'Noe' },
  { value: 'none', label: 'Ingen' },
];

const PERMIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'citizen', label: 'Norsk statsborger' },
  { value: 'permanent_resident', label: 'Permanent opphold' },
  { value: 'work_permit', label: 'Arbeidstillatelse' },
  { value: 'needs_sponsorship', label: 'Trenger sponsing' },
];

const CreateApplicantDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const createMut = useCreateApplicant();
  const { data: positions } = useJobPositions();
  const openPositions = (positions ?? []).filter((p) => p.status === 'open');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [positionId, setPositionId] = useState('');
  const [source, setSource] = useState('manual');
  const [licenseClasses, setLicenseClasses] = useState<Set<string>>(new Set());
  const [yearsExperience, setYearsExperience] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [languageNorwegian, setLanguageNorwegian] = useState('fluent');
  const [workPermit, setWorkPermit] = useState('citizen');
  const [gdpr, setGdpr] = useState(false);
  const [note, setNote] = useState('');

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPositionId('');
    setSource('manual');
    setLicenseClasses(new Set());
    setYearsExperience('');
    setAvailabilityDate('');
    setLanguageNorwegian('fluent');
    setWorkPermit('citizen');
    setGdpr(false);
    setNote('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const toggleLicense = (cls: string) => {
    setLicenseClasses((prev) => {
      const n = new Set(prev);
      if (n.has(cls)) n.delete(cls);
      else n.add(cls);
      return n;
    });
  };

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    positionId &&
    gdpr &&
    !createMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const { applicantId } = await createMut.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        position_id: positionId,
        source,
        qualifications: {
          drivers_license_classes: Array.from(licenseClasses),
          years_experience: yearsExperience ? Number(yearsExperience) : null,
          availability_date: availabilityDate || null,
          language_norwegian: languageNorwegian,
          work_permit_status: workPermit,
        },
        noteContent: note,
      });
      reset();
      onOpenChange(false);
      navigate(`/operations/recruitment/applicants/${applicantId}`);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Legg til søker</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">
                Fornavn <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">
                Etternavn <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                E-post <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Stilling <span className="text-destructive">*</span>
            </Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg åpen stilling" />
              </SelectTrigger>
              <SelectContent>
                {openPositions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Ingen åpne stillinger
                  </div>
                ) : (
                  openPositions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kilde</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm">Kvalifikasjoner</h4>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="years">Års erfaring</Label>
                <Input
                  id="years"
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Tilgjengelig fra</Label>
                <Input
                  id="availability"
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Norsk nivå</Label>
                <Select value={languageNorwegian} onValueChange={setLanguageNorwegian}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arbeidstillatelse</Label>
                <Select value={workPermit} onValueChange={setWorkPermit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={gdpr}
                onCheckedChange={(c) => setGdpr(c === true)}
                className="mt-0.5"
              />
              <span>
                Søkeren har gitt samtykke til behandling av personopplysninger{' '}
                <span className="text-destructive">*</span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notat</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Valgfritt notat om søkeren..."
              emojiAutocomplete={false}
              rows={3}
            />
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
            <Button type="submit" disabled={!canSubmit}>
              {createMut.isPending && <Loader2 className="animate-spin" />}
              Opprett søker
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateApplicantDialog;

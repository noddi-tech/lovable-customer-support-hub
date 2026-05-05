import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { PRESET_COLORS } from '../pipeline/types';
import { useCreateTag, useUpdateTag, type RecruitmentTag } from '@/hooks/recruitment/useTags';

interface Props {
  open: boolean;
  tag: RecruitmentTag | null; // null = create
  onClose: () => void;
}

export function TagEditDialog({ open, tag, onClose }: Props) {
  const isCreate = !tag;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0].value);
  const createMut = useCreateTag();
  const updateMut = useUpdateTag();
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      setName(tag?.name ?? '');
      setDescription(tag?.description ?? '');
      setColor(tag?.color ?? PRESET_COLORS[0].value);
    }
  }, [open, tag]);

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 50;

  const handleSubmit = async () => {
    if (!valid) return;
    try {
      if (isCreate) {
        await createMut.mutateAsync({ name: trimmed, color, description });
      } else {
        await updateMut.mutateAsync({ id: tag!.id, name: trimmed, color, description });
      }
      onClose();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Ny etikett' : 'Rediger etikett'}</DialogTitle>
          <DialogDescription>
            Etiketter brukes til å organisere og filtrere søkere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Navn</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="f.eks. Topp kandidat"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-desc">Beskrivelse (valgfritt)</Label>
            <Textarea
              id="tag-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Hva betyr denne etiketten?"
            />
          </div>
          <div className="space-y-2">
            <Label>Farge</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="h-8 w-8 rounded-full border-2 flex items-center justify-center transition"
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? 'hsl(var(--foreground))' : 'transparent',
                  }}
                  aria-label={c.label}
                >
                  {color === c.value && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {isCreate ? 'Opprett' : 'Lagre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

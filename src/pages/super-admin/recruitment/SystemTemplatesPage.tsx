import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFieldMappingTemplates,
  useCreateTemplate,
  useDeleteTemplate,
} from '@/hooks/recruitment/useFieldMappingTemplates';

export default function SystemTemplatesPage() {
  const { data, isLoading } = useFieldMappingTemplates('system');
  const create = useCreateTemplate();
  const del = useDeleteTemplate();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleHint, setRoleHint] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Navn er påkrevd', variant: 'destructive' });
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        target_role_hint: roleHint.trim() || null,
        scope: 'system',
      });
      toast({ title: 'Mal opprettet' });
      setOpen(false);
      setName('');
      setDescription('');
      setRoleHint('');
    } catch (e: any) {
      toast({ title: 'Opprettelse feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <AdminPortalLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <Heading level={1} className="text-2xl font-semibold">
              Rekruttering — systemmaler
            </Heading>
            <p className="text-sm text-muted-foreground mt-1">
              Maler som er tilgjengelig for alle organisasjoner. Organisasjoner kan kopiere disse
              til egne maler og tilpasse dem.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny mal
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ingen systemmaler ennå.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(data ?? []).map((t) => (
              <Card key={t.id}>
                <CardContent className="py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                    )}
                    {t.target_role_hint && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Anbefalt for: {t.target_role_hint}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/super-admin/recruitment/templates/${t.id}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rediger
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slett systemmal?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Organisasjoner som allerede har kopiert denne malen beholder sine
                            kopier. Handlingen kan ikke angres.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => del.mutate(t.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Slett
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ny systemmal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Navn</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. Standard sjåfør-skjema" />
              </div>
              <div className="space-y-1">
                <Label>Beskrivelse</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Anbefalt for rolle (valgfritt)</Label>
                <Input value={roleHint} onChange={(e) => setRoleHint(e.target.value)} placeholder="f.eks. driver" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleCreate} disabled={create.isPending}>
                Opprett
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPortalLayout>
  );
}

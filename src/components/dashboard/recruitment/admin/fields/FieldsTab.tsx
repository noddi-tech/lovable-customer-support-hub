import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Pencil, Trash2, Copy, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCustomFields,
  useDeleteCustomField,
  type CustomFieldWithType,
} from '@/hooks/recruitment/useCustomFields';
import {
  useFieldMappingTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useForkTemplate,
} from '@/hooks/recruitment/useFieldMappingTemplates';
import { CustomFieldDialog } from './CustomFieldDialog';

export function FieldsTab() {
  const fieldsQ = useCustomFields();
  const deleteField = useDeleteCustomField();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldWithType | null>(null);

  const handleEdit = (f: CustomFieldWithType) => {
    setEditing(f);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteField.mutateAsync(id);
      toast({ title: 'Felt slettet' });
    } catch (e: any) {
      toast({ title: 'Sletting feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Egendefinerte felt</CardTitle>
              <CardDescription>
                Felter som lagres på søkere og kan brukes i skjema-mappinger og rapporter.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nytt felt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fieldsQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (fieldsQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-6 text-center">
              Ingen egendefinerte felt ennå.
            </p>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visningsnavn</TableHead>
                    <TableHead>Nøkkel</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Synlighet</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(fieldsQ.data ?? []).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {f.display_name}
                        {f.is_required && (
                          <Badge variant="outline" className="ml-2">
                            Påkrevd
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {f.field_key}
                      </TableCell>
                      <TableCell className="text-sm">{f.type_display_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.show_on_card && <Badge variant="secondary" className="mr-1">Kort</Badge>}
                        {f.show_on_profile && <Badge variant="secondary">Profil</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(f)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Slett feltet «{f.display_name}»?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Alle eksisterende svar på dette feltet hos søkere blir slettet. Skjema-mappinger
                                som peker på feltet vil ikke lenger lagre svar. Denne handlingen kan ikke angres.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(f.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Slett
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TemplatesSection />

      <CustomFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={editing}
      />
    </div>
  );
}

function TemplatesSection() {
  const orgQ = useFieldMappingTemplates('org');
  const sysQ = useFieldMappingTemplates('system');
  const createTpl = useCreateTemplate();
  const deleteTpl = useDeleteTemplate();
  const forkTpl = useForkTemplate();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    const name = newName.trim() || 'Ny mal';
    try {
      const created = await createTpl.mutateAsync({ name, scope: 'org' });
      setNewName('');
      toast({ title: 'Mal opprettet' });
      navigate(`/admin/recruitment/templates/${(created as any).id}`);
    } catch (e: any) {
      toast({ title: 'Kunne ikke opprette', description: e?.message, variant: 'destructive' });
    }
  };

  const handleFork = async (id: string, name: string) => {
    try {
      const created = await forkTpl.mutateAsync({ sourceTemplateId: id });
      toast({ title: `«${name}» kopiert til organisasjonen` });
      navigate(`/admin/recruitment/templates/${(created as any).id}`);
    } catch (e: any) {
      toast({ title: 'Kopiering feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maler</CardTitle>
        <CardDescription>
          Maler grupperer vanlige tilordninger fra Meta-skjemaspørsmål til standard- og egendefinerte felt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Organisasjonens maler ({(orgQ.data ?? []).length})
          </h4>
          {orgQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (orgQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Ingen egne maler ennå.</p>
          ) : (
            <div className="space-y-2">
              {(orgQ.data ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/admin/recruitment/templates/${t.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slett mal «{t.name}»?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Eksisterende skjema-mappinger som ble bygget fra denne malen påvirkes
                            ikke. Malen blir borte for fremtidig bruk.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              deleteTpl.mutate(t.id, {
                                onSuccess: () => toast({ title: 'Mal slettet' }),
                              })
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Slett
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Navn på ny mal"
              className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
            />
            <Button size="sm" onClick={handleCreate} disabled={createTpl.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Opprett mal
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Systemmaler ({(sysQ.data ?? []).length})
          </h4>
          {sysQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (sysQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Ingen systemmaler tilgjengelig.</p>
          ) : (
            <div className="space-y-2">
              {(sysQ.data ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {t.name}
                    </div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFork(t.id, t.name)}
                    disabled={forkTpl.isPending}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Kopier til organisasjon
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

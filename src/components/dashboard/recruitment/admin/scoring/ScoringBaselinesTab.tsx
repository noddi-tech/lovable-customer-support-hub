import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useScoringBaselines,
  useDeleteScoringBaseline,
  type ScoringBaseline,
} from '@/hooks/recruitment/useScoringBaselines';
import { ScoringBaselineDialog } from './ScoringBaselineDialog';

export function ScoringBaselinesTab() {
  const { data, isLoading } = useScoringBaselines();
  const del = useDeleteScoringBaseline();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScoringBaseline | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (b: ScoringBaseline) => {
    setEditing(b);
    setDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: 'Baseline fjernet' });
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
              <CardTitle className="text-base">Scoring-baselines</CardTitle>
              <CardDescription>
                Gjenbrukbare kriterie-sett som stillinger kan ta utgangspunkt i. AI scorer søkere
                automatisk basert på dette.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Ny baseline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-6 text-center">
              Ingen baselines ennå. Opprett en for å aktivere AI-scoring på stillinger.
            </p>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navn</TableHead>
                    <TableHead>Kriterier</TableHead>
                    <TableHead>Vekter</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((b) => {
                    const criteria = b.rubric?.criteria ?? [];
                    const total = criteria.reduce((a, c) => a + (Number(c.weight) || 0), 0);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {b.name}
                            {b.is_default && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3" />
                                Standard
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {criteria.length === 0
                            ? '—'
                            : criteria.map((c) => c.name).join(', ')}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={total === 100 ? 'secondary' : 'destructive'}>
                            Sum {total}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
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
                                <AlertDialogTitle>Slett baseline «{b.name}»?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Stillinger som peker til denne baselinen vil miste lenken, men
                                  beholder eventuell egen rubrik. Tidligere scoring-historikk
                                  påvirkes ikke.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(b.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Slett
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ScoringBaselineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        baseline={editing}
      />
    </div>
  );
}

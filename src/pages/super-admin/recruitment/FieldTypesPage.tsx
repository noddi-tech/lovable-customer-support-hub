import React, { useState } from 'react';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useCustomFieldTypes,
  useUpdateCustomFieldType,
} from '@/hooks/recruitment/useCustomFieldTypes';
import type { CustomFieldType } from '@/components/dashboard/recruitment/admin/integrations/types';
import { Save } from 'lucide-react';

export default function FieldTypesPage() {
  const { data, isLoading } = useCustomFieldTypes();

  return (
    <AdminPortalLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <Heading level={1} className="text-2xl font-semibold">
            Rekruttering — feltyper
          </Heading>
          <p className="text-sm text-muted-foreground mt-1">
            Plattformkatalog over felttyper som er tilgjengelig for alle organisasjoner.
            Endringer her påvirker alle organisasjoner.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(data ?? []).map((t) => (
              <FieldTypeRow key={t.id} fieldType={t} />
            ))}
          </div>
        )}
      </div>
    </AdminPortalLayout>
  );
}

function FieldTypeRow({ fieldType }: { fieldType: CustomFieldType }) {
  const { toast } = useToast();
  const update = useUpdateCustomFieldType();
  const [no, setNo] = useState(fieldType.display_name_no);
  const [en, setEn] = useState(fieldType.display_name_en);
  const [schema, setSchema] = useState(JSON.stringify(fieldType.validation_schema ?? {}, null, 2));
  const [schemaErr, setSchemaErr] = useState<string | null>(null);

  const dirty =
    no !== fieldType.display_name_no ||
    en !== fieldType.display_name_en ||
    schema.trim() !== JSON.stringify(fieldType.validation_schema ?? {}, null, 2);

  const handleSave = async () => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(schema || '{}');
    } catch (e: any) {
      setSchemaErr('Ugyldig JSON: ' + (e?.message ?? ''));
      return;
    }
    setSchemaErr(null);
    try {
      await update.mutateAsync({
        id: fieldType.id,
        display_name_en: en,
        display_name_no: no,
        validation_schema: parsed,
      });
      toast({ title: 'Felttype oppdatert' });
    } catch (e: any) {
      toast({ title: 'Lagring feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-mono">{fieldType.type_key}</CardTitle>
            <CardDescription>UI-komponent: {fieldType.ui_component}</CardDescription>
          </div>
          <div className="flex gap-2">
            {fieldType.supports_options && <Badge variant="secondary">Støtter alternativer</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Visningsnavn (norsk)</Label>
            <Input value={no} onChange={(e) => setNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Visningsnavn (engelsk)</Label>
            <Input value={en} onChange={(e) => setEn(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valideringsskjema (JSON)</Label>
          <Textarea
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            className="font-mono text-xs h-24"
          />
          {schemaErr && <p className="text-xs text-destructive">{schemaErr}</p>}
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={!dirty || update.isPending} onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Lagre
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

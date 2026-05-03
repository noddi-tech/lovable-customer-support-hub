import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heading } from '@/components/ui/heading';
import { ArrowLeft } from 'lucide-react';
import { TemplateEditor } from '@/components/dashboard/recruitment/admin/fields/TemplateEditor';

export default function OrgTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <Link
        to="/admin/recruitment?tab=fields"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake til felt og maler
      </Link>
      <Heading level={1} className="text-2xl font-semibold">
        Rediger mal
      </Heading>
      {id && <TemplateEditor templateId={id} />}
    </div>
  );
}

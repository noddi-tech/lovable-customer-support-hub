import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';
import { Heading } from '@/components/ui/heading';
import { ArrowLeft } from 'lucide-react';
import { TemplateEditor } from '@/components/dashboard/recruitment/admin/fields/TemplateEditor';

export default function SystemTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AdminPortalLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Link
          to="/super-admin/recruitment/templates"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake til maler
        </Link>
        <Heading level={1} className="text-2xl font-semibold">
          Rediger systemmal
        </Heading>
        {id && <TemplateEditor templateId={id} />}
      </div>
    </AdminPortalLayout>
  );
}

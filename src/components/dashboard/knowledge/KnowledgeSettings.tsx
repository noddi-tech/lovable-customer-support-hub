import { Settings } from "lucide-react";
import { CategoryManager } from "./CategoryManager";
import { TagManager } from "./TagManager";

interface KnowledgeSettingsProps {
  organizationId: string;
}

export function KnowledgeSettings({ organizationId }: KnowledgeSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Settings className="w-6 h-6" />
          Knowledge Base Settings
        </h2>
        <p className="text-muted-foreground">
          Manage categories and tags for your knowledge base entries.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryManager organizationId={organizationId} />
        <TagManager organizationId={organizationId} />
      </div>
    </div>
  );
}

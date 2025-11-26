import { UnifiedAppLayout } from "@/components/layout/UnifiedAppLayout";
import { ImportDataHub } from "@/components/admin/ImportDataHub";

const SuperAdminImport = () => {
  return (
    <UnifiedAppLayout>
      <div className="p-6">
        <ImportDataHub />
      </div>
    </UnifiedAppLayout>
  );
};

export default SuperAdminImport;

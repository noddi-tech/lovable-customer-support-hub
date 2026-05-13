import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PositionsTable from './positions/PositionsTable';
import CreatePositionDialog from './positions/CreatePositionDialog';

const RecruitmentPositions: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Stillinger</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Opprett stilling
        </Button>
      </div>
      <PositionsTable />
      <CreatePositionDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => navigate(`/operations/recruitment/positions/${id}`)}
      />
    </div>
  );
};

export default RecruitmentPositions;

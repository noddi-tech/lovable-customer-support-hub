import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, Kanban, List, UserPlus } from 'lucide-react';

interface Props {
  onAddApplicant: () => void;
  onImport: () => void;
}

export default function QuickActionsBar({ onAddApplicant, onImport }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onImport}>
        <Download />
        Importer historikk
      </Button>
      <Button variant="outline" size="sm" onClick={onAddApplicant}>
        <UserPlus />
        Legg til søker
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate('/operations/recruitment/pipeline')}>
        <Kanban />
        Se kanban
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate('/operations/recruitment/applicants')}>
        <List />
        Se alle søkere
      </Button>
    </div>
  );
}

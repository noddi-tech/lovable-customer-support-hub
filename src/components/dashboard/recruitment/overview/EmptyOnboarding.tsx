import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Props {
  onAddApplicant: () => void;
}

export default function EmptyOnboarding({ onAddApplicant }: Props) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="pt-12 pb-12 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Velkommen til Rekruttering</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Kom i gang ved å koble til en kilde for søkere, importere fra CSV, eller legg til en søker manuelt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate('/admin/recruitment')}>
            Koble til Meta Lead Ads
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/recruitment')}>
            Importer fra CSV
          </Button>
          <Button onClick={onAddApplicant}>Legg til søker manuelt</Button>
        </div>
      </CardContent>
    </Card>
  );
}

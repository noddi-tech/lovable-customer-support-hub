import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PipelineEmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Card className="p-10 max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Briefcase className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Ingen søkere i pipeline ennå</h3>
          <p className="text-sm text-muted-foreground">
            Opprett en stilling og legg til søkere for å komme i gang!
          </p>
        </div>
        <Button asChild>
          <Link to="/operations/recruitment/positions">Gå til stillinger</Link>
        </Button>
      </Card>
    </div>
  );
};

export default PipelineEmptyState;

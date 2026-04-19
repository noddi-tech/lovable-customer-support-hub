import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PositionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        to="/operations/recruitment/positions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake til stillinger
      </Link>
      <div className="flex items-center justify-center h-64 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold mb-2 text-foreground">Stilling</h1>
          {id && <p className="text-xs text-muted-foreground mb-4">ID: {id}</p>}
          <p className="text-muted-foreground">Denne siden er under utvikling</p>
        </div>
      </div>
    </div>
  );
};

export default PositionDetail;

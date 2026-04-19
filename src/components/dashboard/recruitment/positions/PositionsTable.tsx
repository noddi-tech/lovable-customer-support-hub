import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import PositionStatusBadge from './PositionStatusBadge';
import { useJobPositions } from './usePositions';

const PositionsTable: React.FC = () => {
  const { data, isLoading } = useJobPositions();

  if (isLoading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tittel</TableHead>
              <TableHead>Sted</TableHead>
              <TableHead>Kampanje</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Søkere</TableHead>
              <TableHead>Opprettet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-md p-12 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Briefcase className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Ingen stillinger opprettet ennå. Klikk "Opprett stilling" for å komme i gang.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tittel</TableHead>
            <TableHead>Sted</TableHead>
            <TableHead>Kampanje</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Søkere</TableHead>
            <TableHead>Opprettet</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => {
            const count = p.applications?.[0]?.count ?? 0;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    to={`/operations/recruitment/positions/${p.id}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {p.title}
                  </Link>
                </TableCell>
                <TableCell className="text-foreground">
                  {p.location || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {p.campaign || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <PositionStatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-foreground">{count}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: nb })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default PositionsTable;

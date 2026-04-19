import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import PositionStatusBadge from './positions/PositionStatusBadge';
import CreatePositionDialog from './positions/CreatePositionDialog';
import {
  useJobPosition,
  useUpdateJobPositionStatus,
} from './positions/usePositions';

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Heltid',
  part_time: 'Deltid',
  contract: 'Vikariat',
  seasonal: 'Sesong',
};

interface StatusTransition {
  label: string;
  status: string;
}

const TRANSITIONS: Record<string, StatusTransition[]> = {
  draft: [{ label: 'Publiser', status: 'open' }],
  open: [
    { label: 'Pause', status: 'paused' },
    { label: 'Lukk', status: 'closed' },
  ],
  paused: [
    { label: 'Gjenåpne', status: 'open' },
    { label: 'Lukk', status: 'closed' },
  ],
  closed: [{ label: 'Gjenåpne', status: 'open' }],
};

const formatDate = (iso: string | null) =>
  iso ? format(new Date(iso), 'd. MMM yyyy', { locale: nb }) : '—';

const formatSalary = (min: number | null, max: number | null) => {
  if (min == null && max == null) return 'Ikke spesifisert';
  const fmt = (n: number) => `NOK ${n.toLocaleString('nb-NO')}`;
  if (min != null && max != null) return `${fmt(min)} — ${fmt(max)} per år`;
  if (min != null) return `Fra ${fmt(min)} per år`;
  return `Opptil ${fmt(max!)} per år`;
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[160px_1fr] gap-4 py-2 border-b border-border/50 last:border-b-0">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-muted-foreground">{children}</span>
);

const PositionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: position, isLoading } = useJobPosition(id);
  const updateStatusMut = useUpdateJobPositionStatus();
  const [editOpen, setEditOpen] = useState(false);

  const backLink = (
    <Link
      to="/operations/recruitment/positions"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
    >
      <ArrowLeft className="h-4 w-4" />
      Tilbake til stillinger
    </Link>
  );

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {backLink}
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        {backLink}
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold text-foreground">Stilling ikke funnet</h1>
          <p className="text-muted-foreground mt-2">
            Stillingen finnes ikke eller du har ikke tilgang.
          </p>
        </div>
      </div>
    );
  }

  const transitions = TRANSITIONS[position.status] ?? [];
  const req = (position.requirements ?? {}) as {
    drivers_license?: string[];
    min_experience_years?: number | null;
    certifications?: string[];
  };
  const licenses = Array.isArray(req.drivers_license) ? req.drivers_license : [];
  const certs = Array.isArray(req.certifications) ? req.certifications : [];
  const minYears = req.min_experience_years;
  const noRequirements =
    licenses.length === 0 && certs.length === 0 && (minYears == null || minYears === 0);

  const handleStatusChange = (status: string) => {
    updateStatusMut.mutate({
      id: position.id,
      status,
      currentPublishedAt: position.published_at,
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {backLink}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground">{position.title}</h1>
          <PositionStatusBadge status={position.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Rediger
          </Button>
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={updateStatusMut.isPending}>
                  Endre status
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {transitions.map((t) => (
                  <DropdownMenuItem
                    key={t.status}
                    onClick={() => handleStatusChange(t.status)}
                  >
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Detaljer</TabsTrigger>
          <TabsTrigger value="applicants">Søkere</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generelt</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Row label="Tittel">{position.title}</Row>
                <Row label="Beskrivelse">
                  {position.description ? (
                    <span className="whitespace-pre-wrap">{position.description}</span>
                  ) : (
                    <Muted>Ingen beskrivelse</Muted>
                  )}
                </Row>
                <Row label="Sted">{position.location || <Muted>—</Muted>}</Row>
                <Row label="Kampanje">{position.campaign || <Muted>—</Muted>}</Row>
                <Row label="Ansettelsestype">
                  {EMPLOYMENT_LABELS[position.employment_type] ?? position.employment_type}
                </Row>
                <Row label="Lønnsspenn">
                  {formatSalary(position.salary_range_min, position.salary_range_max)}
                </Row>
                <Row label="Pipeline">
                  {position.recruitment_pipelines?.name || <Muted>—</Muted>}
                </Row>
                <Row label="Finn.no lenke">
                  {position.finn_listing_url ? (
                    <a
                      href={position.finn_listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      {position.finn_listing_url}
                    </a>
                  ) : (
                    <Muted>—</Muted>
                  )}
                </Row>
                <Row label="Publisert">{formatDate(position.published_at)}</Row>
                <Row label="Lukkes">{formatDate(position.closes_at)}</Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Krav</CardTitle>
            </CardHeader>
            <CardContent>
              {noRequirements ? (
                <p className="text-sm text-muted-foreground">Ingen krav spesifisert</p>
              ) : (
                <dl>
                  <Row label="Førerkortklasser">
                    {licenses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {licenses.map((l) => (
                          <Badge key={l} variant="secondary">
                            {l}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </Row>
                  <Row label="Minimum erfaring">
                    {minYears != null && minYears > 0 ? (
                      `${minYears} år`
                    ) : (
                      <Muted>Ikke spesifisert</Muted>
                    )}
                  </Row>
                  <Row label="Sertifiseringer">
                    {certs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {certs.map((c) => (
                          <Badge key={c} variant="secondary">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </Row>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applicants" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Søkerlisten kobles til når pipeline er bygget
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreatePositionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        position={position}
      />
    </div>
  );
};

export default PositionDetail;

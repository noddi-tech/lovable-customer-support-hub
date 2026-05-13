import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import PositionStatusBadge from './positions/PositionStatusBadge';
import PositionForm from './positions/PositionForm';
import PositionScoringConfig from './positions/PositionScoringConfig';
import PositionStageFieldRequirements from './positions/PositionStageFieldRequirements';
import {
  useJobPosition,
  useUpdateJobPositionStatus,
} from './positions/usePositions';

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

const VALID_TABS = ['details', 'applicants', 'scoring', 'stage-fields'] as const;
type TabValue = (typeof VALID_TABS)[number];

const PositionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: position, isLoading } = useJobPosition(id);
  const updateStatusMut = useUpdateJobPositionStatus();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabValue = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as TabValue)
    : 'details';
  const setTab = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'details') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

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

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="details">Detaljer</TabsTrigger>
          <TabsTrigger value="applicants">Søkere</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="stage-fields">Trinn-krav</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detaljer</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionForm mode="edit" position={position} embedded />
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

        <TabsContent value="scoring" className="mt-4">
          <PositionScoringConfig positionId={position.id} />
        </TabsContent>

        <TabsContent value="stage-fields" className="mt-4">
          <PositionStageFieldRequirements positionId={position.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PositionDetail;

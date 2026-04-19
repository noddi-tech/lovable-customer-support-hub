import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ApplicantSourceBadge from './ApplicantSourceBadge';
import ApplicantStageBadge from './ApplicantStageBadge';
import ScoreCircle from './ScoreCircle';
import ApplicantInfoCard from './ApplicantInfoCard';
import ApplicantEventTimeline from './ApplicantEventTimeline';
import ApplicantNotesTab from './ApplicantNotesTab';
import ApplicantFilesTab from './ApplicantFilesTab';
import LogEventForm from './LogEventForm';
import MoveStageDialog from './MoveStageDialog';
import { useApplicantPipeline, type PipelineStage } from './useApplicants';
import {
  useApplicantEvents,
  useApplicantProfile,
  useAssignApplication,
} from './useApplicantProfile';
import { useTeamMembers } from '@/hooks/useTeamMembers';

const ApplicantProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/operations/recruitment/applicants');
    }
  };
  const { data: applicant, isLoading } = useApplicantProfile(id);
  const { data: events } = useApplicantEvents(id);
  const { data: pipeline } = useApplicantPipeline();
  const { data: team } = useTeamMembers();
  const assignMut = useAssignApplication();

  const [tab, setTab] = useState('overview');
  const [logOpen, setLogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<PipelineStage | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake
        </button>
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold mb-2 text-foreground">Søker ikke funnet</h1>
        </div>
      </div>
    );
  }

  const apps = applicant.applications ?? [];
  const firstApp = apps[0] ?? null;
  const stages = pipeline?.stages ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake
      </button>

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">
          {applicant.first_name} {applicant.last_name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {applicant.email && (
            <a
              href={`mailto:${applicant.email}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5" />
              {applicant.email}
            </a>
          )}
          {applicant.phone && (
            <a
              href={`tel:${applicant.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              {applicant.phone}
            </a>
          )}
          {applicant.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {applicant.location}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ApplicantSourceBadge source={applicant.source} />
          {firstApp && (
            <ApplicantStageBadge stageId={firstApp.current_stage_id} pipeline={pipeline} />
          )}
          <ScoreCircle score={firstApp?.score ?? null} />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setTab('email')}>
            <Mail />
            Send e-post
          </Button>
          <Button variant="outline" size="sm" asChild disabled={!applicant.phone}>
            {applicant.phone ? (
              <a href={`tel:${applicant.phone}`}>
                <Phone />
                Ring
              </a>
            ) : (
              <span>
                <Phone />
                Ring
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={!firstApp || stages.length === 0}>
                Flytt til...
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Velg fase</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {stages.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => setMoveTarget(s)}
                  disabled={s.id === firstApp?.current_stage_id}
                >
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!firstApp}>
                <UserCheck />
                Tilordne
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Velg ansvarlig</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(team ?? []).map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => {
                    if (!firstApp) return;
                    assignMut.mutate({
                      applicationId: firstApp.id,
                      applicantId: applicant.id,
                      profileId: m.id,
                      profileName: m.full_name ?? m.email,
                    });
                  }}
                  disabled={firstApp?.assigned_to === m.id}
                >
                  {m.full_name ?? m.email}
                </DropdownMenuItem>
              ))}
              {(!team || team.length === 0) && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Ingen teammedlemmer
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="notes">Notater</TabsTrigger>
          <TabsTrigger value="files">Filer</TabsTrigger>
          <TabsTrigger value="email">E-post</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Hendelser</CardTitle>
                  <Popover open={logOpen} onOpenChange={setLogOpen}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus />
                        Logg hendelse
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto">
                      <LogEventForm
                        applicantId={applicant.id}
                        applicationId={firstApp?.id ?? null}
                        onDone={() => setLogOpen(false)}
                      />
                    </PopoverContent>
                  </Popover>
                </CardHeader>
                <CardContent>
                  <ApplicantEventTimeline events={events ?? []} pipeline={pipeline} />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <ApplicantInfoCard applicant={applicant} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <ApplicantNotesTab
            applicantId={applicant.id}
            applicationId={firstApp?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <ApplicantFilesTab
            applicantId={applicant.id}
            applicationId={firstApp?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              E-postkommunikasjon kobles til i fase 6
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {moveTarget && firstApp && (
        <MoveStageDialog
          open={!!moveTarget}
          onOpenChange={(o) => !o && setMoveTarget(null)}
          applicantName={`${applicant.first_name} ${applicant.last_name}`}
          applicantId={applicant.id}
          applicationId={firstApp.id}
          fromStageId={firstApp.current_stage_id}
          toStageId={moveTarget.id}
          toStageName={moveTarget.name}
        />
      )}
    </div>
  );
};

export default ApplicantProfile;

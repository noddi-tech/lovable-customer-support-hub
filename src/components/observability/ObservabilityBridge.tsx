import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { tracking } from '@/integrations/observability';

/**
 * Keeps the telemetry shippers in sync with app state:
 * - identifies the signed-in user (and their organization as a group)
 * - tracks client-side route changes as page views
 */
export function ObservabilityBridge() {
  const { user, profile, role, organizationId, currentMembership } = useAuth();
  const location = useLocation();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || identifiedRef.current === user.id) return;
    identifiedRef.current = user.id;

    tracking.identify({
      id: user.id,
      email: user.email ?? null,
      isWorker: true,
    });

    if (role) tracking.setPeopleProperty('role', role);
  }, [user?.id, user?.email, role]);

  useEffect(() => {
    if (!organizationId) return;
    tracking.setGroups([
      {
        type: 'organization',
        id: organizationId,
        name: (currentMembership as { organizations?: { name?: string } } | undefined)
          ?.organizations?.name,
      },
    ]);
  }, [organizationId, currentMembership]);

  useEffect(() => {
    tracking.track('page viewed', {
      path: location.pathname,
      search: location.search || undefined,
      organizationId: organizationId ?? undefined,
    });
  }, [location.pathname, location.search, organizationId]);

  useEffect(() => {
    if (profile?.id) tracking.register({ profileId: profile.id });
  }, [profile?.id]);

  return null;
}

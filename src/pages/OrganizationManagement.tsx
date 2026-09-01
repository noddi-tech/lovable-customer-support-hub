import React, { useState } from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Crown, Plus, Search, Users, Calendar, Info, RefreshCw } from 'lucide-react';
import { useServiceOrganizations } from '@/hooks/useServiceOrganizations';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { CreateOrganizationModal } from '@/components/organization/CreateOrganizationModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';

export default function OrganizationManagement() {
  const navigate = useNavigate();
  const { organizations, isLoading } = useOrganizations();
  const { data: serviceOrgs, isFetching: isFetchingServiceOrgs, refetch: refetchServiceOrgs } =
    useServiceOrganizations();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminPortalLayout>
      <div className="bg-gradient-to-br from-yellow-50/30 via-background to-amber-50/20 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10 min-h-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              <Heading level={1} className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-500 dark:to-amber-500 bg-clip-text text-transparent">
                Service Organizations
              </Heading>
            </div>
            <p className="text-muted-foreground">
              Mirror and manage the Navio service organizations that use the Support Hub
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service Organization
          </Button>
        </div>

        {/* What service organizations are used for */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                What service organizations are used for
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => refetchServiceOrgs()}
                disabled={isFetchingServiceOrgs}
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingServiceOrgs ? 'animate-spin' : ''}`} />
                Refresh from Navio
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              A service organization is the tenant boundary of the Support Hub. It maps 1:1 to a service
              organization in the Navio backend API, which stays the source of truth for the catalog.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Every conversation, case, customer, inbox and knowledge entry belongs to one service organization.</li>
              <li>Access is scoped by membership — users only see data from organizations they belong to.</li>
              <li>Branding and the sending identity (colour, sender display name, email domains) are set per organization.</li>
              <li>Service departments, brands and tickets are fetched from Navio under the same organization.</li>
            </ul>
            <p>
              The Navio catalog is fetched on demand and cached for a few hours; use “Refresh from Navio” to pull it
              again immediately. Adding one here creates the local tenant linked to its Navio id.
              {serviceOrgs ? ` ${serviceOrgs.length} available in Navio.` : ''}
            </p>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Organizations List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-yellow-200 dark:border-yellow-900/50">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredOrgs.length === 0 ? (
            <Card className="col-span-full border-yellow-200 dark:border-yellow-900/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchQuery
                    ? 'No service organizations found matching your search'
                    : 'No service organizations yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrgs.map((org) => (
              <Card
                key={org.id}
                className="border-yellow-200 dark:border-yellow-900/50 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/super-admin/organizations/${org.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: org.primary_color }}
                      >
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                          {org.name}
                        </CardTitle>
                        <CardDescription>/{org.slug}</CardDescription>
                        {org.navio_organization_id != null && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Navio #{org.navio_organization_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </div>
                    {org.sender_display_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {org.sender_display_name}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <CreateOrganizationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </AdminPortalLayout>
  );
}

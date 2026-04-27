import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import RecruitmentOverview from './recruitment/RecruitmentOverview';
import RecruitmentPipeline from './recruitment/RecruitmentPipeline';
import RecruitmentApplicants from './recruitment/RecruitmentApplicants';
import RecruitmentPositions from './recruitment/RecruitmentPositions';
import ApplicantProfile from './recruitment/applicants/ApplicantProfile';
import PositionDetail from './recruitment/PositionDetail';

const BASE = '/operations/recruitment';

const TABS = [
  { label: 'Oversikt', path: BASE },
  { label: 'Pipeline', path: `${BASE}/pipeline` },
  { label: 'Søkere', path: `${BASE}/applicants` },
  { label: 'Stillinger', path: `${BASE}/positions` },
];

const RecruitmentInterface: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '');
  const sub = pathname.startsWith(BASE)
    ? pathname.slice(BASE.length).replace(/^\//, '')
    : '';

  // Detail routes — render without tab bar
  if (/^applicants\/[^/]+/.test(sub)) {
    return (
      <div className="w-full h-full overflow-auto">
        <ApplicantProfile />
      </div>
    );
  }
  if (/^positions\/[^/]+/.test(sub)) {
    return (
      <div className="w-full h-full overflow-auto">
        <PositionDetail />
      </div>
    );
  }

  const renderContent = () => {
    const segment = sub.split('/')[0];
    switch (segment) {
      case 'pipeline':
        return <RecruitmentPipeline />;
      case 'applicants':
        return <RecruitmentApplicants />;
      case 'positions':
        return <RecruitmentPositions />;
      case 'import':
        return <RecruitmentImport />;
      case '':
      default:
        return <RecruitmentOverview />;
    }
  };

  const isTabActive = (tabPath: string) => {
    if (tabPath === BASE) {
      return pathname === BASE;
    }
    return pathname === tabPath || pathname.startsWith(tabPath + '/');
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <nav className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="flex items-center gap-1 px-4 overflow-x-auto">
          {TABS.map((tab) => {
            const active = isTabActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
};

export default RecruitmentInterface;

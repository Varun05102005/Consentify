import type {ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';
import {useUserApp} from '../../hooks/useUserApp';
import {
  formatAppStatus,
  formatCategory,
  formatRelativeTime,
} from '../../lib/appView';
import {Card} from '../ui/Card';
import {EmptyState} from '../ui/EmptyState';
import {ErrorState} from '../ui/ErrorState';
import {IconButton} from '../ui/IconButton';
import {LoadingState} from '../ui/LoadingState';
import {SectionHeader} from '../ui/SectionHeader';
import {AppIcon} from './AppIcon';
import {AppRiskHero} from './AppRiskHero';
import {AiRiskExplanation} from './AiRiskExplanation';
import {PermissionRiskRow} from './PermissionRiskRow';

function DetailsChrome({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="cf-screen">
      <header className="flex items-center gap-2">
        <IconButton label="Back to applications" onClick={onBack}>
          <ArrowLeft size={22} />
        </IconButton>
        <h1 className="cf-section-title">Application Details</h1>
      </header>
      {children}
    </div>
  );
}

export const AppDetailsScreen = ({appId, onBack}: {appId: string; onBack: () => void}) => {
  const {app, appRisk, rankedPermissions, isLoading, error, notFound, refresh} = useUserApp(appId);

  if (isLoading && !app) {
    return (
      <DetailsChrome onBack={onBack}>
        <LoadingState message="Loading application details..." />
      </DetailsChrome>
    );
  }

  if (error && !app) {
    return (
      <DetailsChrome onBack={onBack}>
        <ErrorState message={error} onRetry={() => { void refresh(); }} />
      </DetailsChrome>
    );
  }

  if (notFound || !app || !appRisk) {
    return (
      <DetailsChrome onBack={onBack}>
        <EmptyState
          title="App not found"
          description="This app is unavailable or was removed."
        />
      </DetailsChrome>
    );
  }

  const packageName = app.packageName?.trim() || '';
  const created = formatRelativeTime(app.createdAt);
  const updated = formatRelativeTime(app.updatedAt);
  const lastScanned = formatRelativeTime(app.lastScannedAt);

  return (
    <DetailsChrome onBack={onBack}>
      <Card className="flex items-center gap-3">
        <AppIcon icon={app.icon} name={app.name} size="lg" />
        <div className="min-w-0">
          <h2 className="cf-page-title truncate">{app.name}</h2>
          {packageName ? (
            <p className="cf-secondary mt-1 break-all">{packageName}</p>
          ) : null}
          <p className="cf-caption mt-2">{formatAppStatus(app.status)}</p>
        </div>
      </Card>

      <AppRiskHero appRisk={appRisk} />

      <section>
        <SectionHeader title="Why this risk?" />
        <Card className="mt-3 space-y-3">
          <p className="cf-body">{appRisk.summary}</p>
          {appRisk.reasons.length > 0 ? (
            <ul className="space-y-1.5">
              {appRisk.reasons.map((reason) => (
                <li key={reason} className="cf-secondary">
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="cf-secondary">
            Consentify calculates permission risk from recorded grant state. It does not prove malicious behavior or observe live device access.
          </p>
        </Card>
      </section>

      <AiRiskExplanation
        appName={app.name}
        appRisk={appRisk}
        rankedPermissions={rankedPermissions}
      />

      <section>
        <SectionHeader
          title="Permission Breakdown"
          subtitle="Calculated risk contribution from each recorded permission."
        />
        <div className="mt-3 space-y-2">
          {rankedPermissions.length === 0 ? (
            <EmptyState headingLevel={3} title="No permissions recorded" />
          ) : (
            rankedPermissions.map((scored, index) => (
              <div key={`${scored.type}-${scored.label}-${index}`}>
                <PermissionRiskRow
                  scored={scored}
                  defaultOpen={index === 0}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Application Information" />
        <Card className="mt-3 space-y-3">
          {packageName ? (
            <MetaRow label="Package name" value={packageName} />
          ) : null}
          <MetaRow label="Status" value={formatAppStatus(app.status)} />
          <MetaRow label="Category" value={formatCategory(app.category)} />
          <MetaRow label="Permission count" value={String(app.permissions.length)} />
          {created ? <MetaRow label="Created" value={created} /> : null}
          {updated ? <MetaRow label="Updated" value={updated} /> : null}
          {lastScanned ? <MetaRow label="Last scanned" value={lastScanned} /> : null}
        </Card>
      </section>
    </DetailsChrome>
  );
};

function MetaRow({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <p className="cf-caption">{label}</p>
      <p className="cf-body mt-1 break-all">{value}</p>
    </div>
  );
}

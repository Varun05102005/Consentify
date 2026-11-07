import {Activity, Bell, Camera, ChevronDown, Folder, Image, MapPin, Mic, Shield, Users} from 'lucide-react';
import {formatPermissionStatus, permissionCaption} from '../../lib/appView';
import {formatScore} from '../../lib/ui';
import type {PermissionRiskResult, PermissionStatus, PermissionType} from '../../types';
import {RiskBadge} from '../common/RiskBadge';
import {RISK_ICON_SURFACE, RISK_TEXT_CLASS} from './riskVisual';

const PERMISSION_ICONS = {
  location: MapPin,
  camera: Camera,
  microphone: Mic,
  storage: Folder,
  photos: Image,
  contacts: Users,
  notifications: Bell,
  sensors: Activity,
  other: Shield,
} as const;

const STATUS_CLASS: Record<PermissionStatus, string> = {
  granted: 'bg-risk-safe-soft text-risk-safe border-risk-safe-ring',
  denied: 'bg-canvas-subtle text-fg-secondary border-line',
  restricted: 'bg-risk-medium-soft text-risk-medium border-risk-medium-ring',
  unknown: 'bg-brand-soft text-brand-info border-line-subtle',
};

function PermissionIcon({type}: {type: PermissionType}) {
  const Icon = PERMISSION_ICONS[type] ?? Shield;
  return <Icon size={18} aria-hidden="true" />;
}

export function PermissionRiskRow({
  scored,
  defaultOpen = false,
}: {
  scored: PermissionRiskResult;
  defaultOpen?: boolean;
}) {
  const reasons = scored.reasons;
  const whyItMatters = reasons[0] ?? permissionCaption(scored);

  return (
    <details
      open={defaultOpen}
      className={`group bg-surface border border-line-subtle rounded-cf-lg shadow-cf-card ${
        scored.riskLevel === 'High' ? 'border-l-4 border-l-risk-high' : ''
      }`}
    >
      <summary className="flex items-start gap-3 p-[var(--cf-card-pad)] min-h-11 cursor-pointer list-none rounded-cf-lg [&::-webkit-details-marker]:hidden transition-colors duration-[var(--cf-duration)] ease-[var(--cf-ease)] hover:bg-canvas-subtle">
        <div className={`w-11 h-11 shrink-0 rounded-cf-md flex items-center justify-center ${RISK_ICON_SURFACE[scored.riskLevel]}`}>
          <PermissionIcon type={scored.type} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="cf-card-title truncate">{scored.label}</h3>
            <ChevronDown
              size={16}
              className="shrink-0 text-fg-muted mt-0.5 transition-transform duration-[var(--cf-duration)] group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`cf-badge inline-flex rounded-cf-pill border px-2 py-0.5 ${STATUS_CLASS[scored.status]}`}>
              {formatPermissionStatus(scored.status)}
            </span>
            <RiskBadge risk={scored.riskLevel} />
            <span className={`cf-secondary tabular-nums ${RISK_TEXT_CLASS[scored.riskLevel]}`}>
              {formatScore(scored.riskScore)}
            </span>
          </div>
        </div>
      </summary>

      <div className="cf-details-body px-[var(--cf-card-pad)] pb-[var(--cf-card-pad)] space-y-2">
        <p className="cf-caption">Risk score</p>
        <p className={`cf-body tabular-nums ${RISK_TEXT_CLASS[scored.riskLevel]}`}>
          {formatScore(scored.riskScore)}
        </p>
        {scored.backgroundAccess ? (
          <p className="cf-secondary">Background access enabled</p>
        ) : null}
        <p className="cf-caption mt-3">Why it matters</p>
        {reasons.length > 0 ? (
          <ul className="space-y-1">
            {reasons.map((reason) => (
              <li key={reason} className="cf-secondary">
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="cf-secondary">{whyItMatters}</p>
        )}
      </div>
    </details>
  );
}

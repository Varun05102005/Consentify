import {AlertTriangle, Info, ShieldCheck} from 'lucide-react';
import {RISK_LABEL, RISK_TONE_CLASS} from '../../lib/ui';
import type {RiskLevel} from '../../types';

const RISK_ICON = {
  High: AlertTriangle,
  Medium: Info,
  Safe: ShieldCheck,
} as const;

export const RiskBadge = ({risk}: {risk: RiskLevel}) => {
  const Icon = RISK_ICON[risk];

  return (
    <span
      role="status"
      aria-label={`Risk ${RISK_LABEL[risk]}`}
      className={`cf-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-cf-pill border ${RISK_TONE_CLASS[risk]}`}
    >
      <Icon size={10} aria-hidden="true" />
      {RISK_LABEL[risk].toUpperCase()}
    </span>
  );
};

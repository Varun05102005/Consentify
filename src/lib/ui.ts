import type {RiskLevel} from '../types';

/** Tailwind class sets for the shared risk visual language. */
export const RISK_TONE_CLASS: Record<RiskLevel, string> = {
  High: 'bg-risk-high-soft text-risk-high border-risk-high-ring',
  Medium: 'bg-risk-medium-soft text-risk-medium border-risk-medium-ring',
  Safe: 'bg-risk-safe-soft text-risk-safe border-risk-safe-ring',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  High: 'High',
  Medium: 'Medium',
  Safe: 'Safe',
};

export function formatScore(score: number): string {
  return `${score} / 100`;
}

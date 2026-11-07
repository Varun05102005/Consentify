import {ShieldAlert, ShieldCheck, TriangleAlert} from 'lucide-react';
import type {RiskLevel} from '../../types';

export const RISK_TEXT_CLASS: Record<RiskLevel, string> = {
  High: 'text-risk-high',
  Medium: 'text-risk-medium',
  Safe: 'text-risk-safe',
};

export const RISK_ICON_SURFACE: Record<RiskLevel, string> = {
  High: 'bg-risk-high-soft text-risk-high',
  Medium: 'bg-risk-medium-soft text-risk-medium',
  Safe: 'bg-risk-safe-soft text-risk-safe',
};

export function progressTone(level: RiskLevel): 'high' | 'medium' | 'safe' {
  if (level === 'High') {
    return 'high';
  }
  if (level === 'Medium') {
    return 'medium';
  }
  return 'safe';
}

export function RiskGlyph({level, size = 16}: {level: RiskLevel; size?: number}) {
  if (level === 'High') {
    return <ShieldAlert size={size} aria-hidden="true" />;
  }
  if (level === 'Medium') {
    return <TriangleAlert size={size} aria-hidden="true" />;
  }
  return <ShieldCheck size={size} aria-hidden="true" />;
}

import {Info, ShieldCheck} from 'lucide-react';
import {Card} from '../ui/Card';
import {ProgressBar} from '../ui/ProgressBar';

function scoreTone(score: number): 'safe' | 'medium' | 'high' {
  if (score >= 70) {
    return 'safe';
  }
  if (score >= 40) {
    return 'medium';
  }
  return 'high';
}

const SCORE_TEXT_CLASS = {
  safe: 'text-risk-safe',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
} as const;

const SCORE_TONE_LABEL = {
  safe: 'Strong',
  medium: 'Needs attention',
  high: 'Requires review',
} as const;

export function privacyScoreMessage(score: number, totalApps: number): string {
  if (totalApps === 0) {
    return 'Connect an application to start reviewing permission risk.';
  }
  if (score >= 90) {
    return 'Your privacy posture is currently strong.';
  }
  if (score >= 70) {
    return 'Some permissions deserve attention.';
  }
  return 'Several permissions require review.';
}

export function PrivacyScoreCard({
  score,
  totalApps,
}: {
  score: number;
  totalApps: number;
}) {
  const tone = scoreTone(score);
  const message = privacyScoreMessage(score, totalApps);

  return (
    <Card className="cf-card-interactive">
      <div className="flex items-center justify-between gap-3">
        <p className="cf-caption">Privacy Score</p>
        <span className="text-fg-muted" title="Calculated from recorded permission data">
          <Info size={16} aria-hidden="true" />
          <span className="sr-only">Calculated from recorded application permission data</span>
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center text-center">
        <ShieldCheck size={22} className="text-brand" aria-hidden="true" />
        <div className="mt-2 flex items-end justify-center gap-1">
          <span className={`text-[2.5rem] leading-none font-bold tracking-tight tabular-nums ${SCORE_TEXT_CLASS[tone]}`}>
            {score}
          </span>
          <span className="cf-secondary mb-1">/ 100</span>
        </div>
        <p className="cf-caption mt-2">{SCORE_TONE_LABEL[tone]}</p>
      </div>

      <div className="mt-5">
        <ProgressBar value={score} tone={tone} label={`Privacy score ${score} out of 100, ${SCORE_TONE_LABEL[tone]}`} />
      </div>

      <p className="cf-body mt-4">{message}</p>
      <p className="cf-secondary mt-2">
        Based on your connected applications and their permission risk. Consentify does not verify live device access.
      </p>
    </Card>
  );
}

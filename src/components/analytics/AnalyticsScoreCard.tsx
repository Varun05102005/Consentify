import {ShieldCheck} from 'lucide-react';
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

export function AnalyticsScoreCard({score}: {score: number}) {
  const tone = scoreTone(score);

  return (
    <Card className="cf-card-interactive">
      <p className="cf-caption">Privacy Score</p>
      <div className="mt-4 flex items-end gap-2">
        <ShieldCheck size={22} className="mb-1 text-brand" aria-hidden="true" />
        <span className={`text-[2.5rem] leading-none font-bold tracking-tight tabular-nums ${SCORE_TEXT_CLASS[tone]}`}>
          {score}
        </span>
        <span className="cf-secondary mb-1">/ 100</span>
      </div>
      <p className="cf-caption mt-2">{SCORE_TONE_LABEL[tone]}</p>
      <div className="mt-4">
        <ProgressBar
          value={score}
          tone={tone}
          label={`Privacy score ${score} out of 100, ${SCORE_TONE_LABEL[tone]}`}
        />
      </div>
      <p className="cf-secondary mt-4">
        Calculated from the risk of your active connected applications.
      </p>
    </Card>
  );
}

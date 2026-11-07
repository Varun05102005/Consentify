function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

const TONE_CLASS = {
  brand: 'bg-brand',
  safe: 'bg-risk-safe',
  medium: 'bg-risk-medium',
  high: 'bg-risk-high',
} as const;

export function ProgressBar({
  value,
  tone = 'brand',
  label,
}: {
  value: number;
  tone?: keyof typeof TONE_CLASS;
  label?: string;
}) {
  const width = clampPercent(value);

  return (
    <div
      className="w-full h-2.5 bg-canvas-subtle rounded-cf-pill overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`cf-progress-fill h-full rounded-cf-pill ${TONE_CLASS[tone]}`} style={{width: `${width}%`}} />
    </div>
  );
}

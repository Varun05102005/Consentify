import type {ReactNode} from 'react';
import {Button} from './Button';

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
  action,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-surface border border-risk-high-ring rounded-cf-lg p-[var(--cf-card-pad)]" role="alert">
      <p className="cf-body font-medium text-danger">{message}</p>
      {action}
      {onRetry ? (
        <Button className="mt-4 w-full" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

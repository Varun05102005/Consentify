import type {HTMLAttributes, ReactNode} from 'react';

export function Badge({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {children: ReactNode}) {
  return (
    <span
      className={`cf-badge inline-flex items-center gap-1 rounded-cf-pill border px-2 py-0.5 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

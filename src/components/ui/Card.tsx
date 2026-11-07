import type {HTMLAttributes, ReactNode} from 'react';

export function Card({
  children,
  className = '',
  padding = 'md',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md';
}) {
  const pads = {
    none: '',
    sm: 'p-3',
    md: 'p-[var(--cf-card-pad)]',
  };

  return (
    <div
      className={`bg-surface border border-line-subtle rounded-cf-lg shadow-cf-card ${pads[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

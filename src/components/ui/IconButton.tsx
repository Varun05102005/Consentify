import type {ButtonHTMLAttributes, ReactNode} from 'react';

export function IconButton({
  children,
  label,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`cf-touch cf-press inline-flex items-center justify-center rounded-cf-md text-fg-secondary hover:bg-canvas-subtle disabled:text-fg-disabled disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

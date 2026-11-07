import type {ButtonHTMLAttributes, ReactNode} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-fg-on-accent hover:bg-brand-hover disabled:bg-brand-soft disabled:text-fg-disabled',
    secondary: 'bg-surface text-fg border border-line hover:bg-canvas-subtle disabled:text-fg-disabled',
    ghost: 'bg-transparent text-brand hover:bg-brand-soft disabled:text-fg-disabled',
    danger: 'bg-danger text-fg-on-accent hover:opacity-90 disabled:opacity-50',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'min-h-9 px-3 text-xs',
    md: 'min-h-11 px-4 text-sm',
  };

  return (
    <button
      type={type}
      className={`cf-press inline-flex items-center justify-center gap-2 rounded-cf-md font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

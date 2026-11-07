import type {ReactNode} from 'react';

export const NavIcon = ({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    className={`min-h-11 w-full min-w-0 flex flex-col items-center justify-center gap-1 rounded-cf-sm px-0.5 py-1 transition-colors duration-[var(--cf-duration)] ease-[var(--cf-ease)] ${
      active ? 'text-brand' : 'text-fg-muted hover:text-fg-secondary'
    }`}
  >
    <span className={active ? 'text-brand' : 'text-fg-muted'} aria-hidden="true">
      {icon}
    </span>
    <span className="text-[10px] leading-tight font-semibold tracking-tight text-center max-w-full truncate">
      {label}
    </span>
  </button>
);

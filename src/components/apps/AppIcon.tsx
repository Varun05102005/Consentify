import {AppWindow} from 'lucide-react';
import {appInitials, isStoredImageIcon} from '../../lib/appView';

const SIZE_CLASS = {
  sm: 'w-11 h-11 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
} as const;

const ICON_SIZE = {
  sm: 18,
  md: 22,
  lg: 28,
} as const;

export function AppIcon({
  icon,
  name,
  size = 'md',
}: {
  icon: string;
  name: string;
  size?: keyof typeof SIZE_CLASS;
}) {
  if (isStoredImageIcon(icon)) {
    return (
      <img
        src={icon}
        alt=""
        className={`${SIZE_CLASS[size]} shrink-0 rounded-cf-md object-cover bg-canvas-subtle border border-line-subtle`}
      />
    );
  }

  const initials = appInitials(name);

  return (
    <div
      className={`${SIZE_CLASS[size]} shrink-0 rounded-cf-md bg-brand-soft text-brand border border-line-subtle flex items-center justify-center font-bold`}
      aria-hidden="true"
    >
      {initials ? initials : <AppWindow size={ICON_SIZE[size]} />}
    </div>
  );
}

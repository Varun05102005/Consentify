import type {ReactNode} from 'react';
import {Divider} from '../ui/Divider';

export function SettingsRow({
  icon,
  label,
  caption,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  caption?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 min-h-11 py-3">
      <div
        className="w-11 h-11 shrink-0 rounded-cf-md bg-canvas-subtle text-fg-secondary flex items-center justify-center"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="cf-card-title">{label}</p>
        {caption ? <p className="cf-secondary mt-0.5">{caption}</p> : null}
      </div>
      {trailing ? <div className="shrink-0 self-center">{trailing}</div> : null}
    </div>
  );
}

export function SettingsStack({children}: {children: ReactNode}) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div>
      {items.map((child, index) => (
        <div key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </div>
      ))}
    </div>
  );
}

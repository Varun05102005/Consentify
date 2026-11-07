import {UserRound} from 'lucide-react';

function greetingPrefix(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function DashboardHeader({greetingName}: {greetingName: string}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="cf-caption">Privacy Overview</p>
        <h1 className="cf-page-title mt-1">
          {greetingPrefix()}, {greetingName}
        </h1>
        <p className="cf-secondary mt-2">
          Monitor how your connected applications use sensitive permissions.
        </p>
      </div>
      <div
        className="w-11 h-11 shrink-0 rounded-full bg-surface border border-line-subtle shadow-cf-subtle flex items-center justify-center text-brand"
        aria-hidden="true"
      >
        <UserRound size={20} />
      </div>
    </header>
  );
}

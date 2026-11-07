import {UserRound} from 'lucide-react';
import {Card} from '../ui/Card';
import {LoadingState} from '../ui/LoadingState';

function accountInitials(displayName: string | null, email: string | null): string | null {
  const name = displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  const local = email?.trim().charAt(0);
  return local ? local.toUpperCase() : null;
}

export function AccountCard({
  displayName,
  email,
  isLoading,
}: {
  displayName: string | null;
  email: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <LoadingState message="Loading your account..." />;
  }

  const initials = accountInitials(displayName, email);
  const name = displayName?.trim() || 'Your account';

  return (
    <Card className="flex items-center gap-3">
      <div
        className="w-11 h-11 shrink-0 rounded-full bg-brand-soft text-brand flex items-center justify-center"
        aria-hidden="true"
      >
        {initials ? (
          <span className="text-sm font-bold">{initials}</span>
        ) : (
          <UserRound size={20} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="cf-card-title truncate">{name}</p>
        {email ? <p className="cf-secondary mt-0.5 truncate">{email}</p> : null}
        <p className="cf-caption mt-1.5">Signed in</p>
      </div>
    </Card>
  );
}

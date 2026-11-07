export function LoadingState({message = 'Loading...'}: {message?: string}) {
  return (
    <div
      className="bg-surface border border-line-subtle rounded-cf-lg shadow-cf-card p-[var(--cf-card-pad)] cf-fade-in"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-1 w-full rounded-cf-pill bg-canvas-subtle overflow-hidden mb-4"
        aria-hidden="true"
      >
        <div className="h-full w-1/3 rounded-cf-pill bg-brand motion-safe:animate-pulse" />
      </div>
      <p className="cf-secondary">{message}</p>
    </div>
  );
}

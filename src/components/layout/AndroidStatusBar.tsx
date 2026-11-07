import {Battery, Signal} from 'lucide-react';

export const AndroidStatusBar = () => (
  <div className="flex justify-between items-center px-5 py-1.5 bg-transparent shrink-0">
    <span className="text-[11px] font-semibold tabular-nums text-fg-muted">9:41</span>
    <div className="flex gap-1.5 items-center text-fg-muted">
      <Signal size={12} aria-hidden="true" />
      <Battery size={12} aria-hidden="true" />
      <span className="sr-only">Signal and battery</span>
    </div>
  </div>
);

import type {ReactNode} from 'react';
import {BellRing, ChartNoAxesCombined, Grid2X2, LayoutDashboard, Settings2} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {usePrefersReducedMotion} from '../../hooks/usePrefersReducedMotion';
import type {ActiveTab} from '../../types';
import {AndroidStatusBar} from './AndroidStatusBar';
import {NavIcon} from './NavIcon';

export const PhoneFrame = ({
  activeTab = 'dashboard',
  selectedAppId = null,
  onTabChange,
  children,
  hideNav = false,
}: {
  activeTab?: ActiveTab;
  selectedAppId?: string | null;
  onTabChange?: (tab: ActiveTab) => void;
  children: ReactNode;
  hideNav?: boolean;
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? 0 : 0.2;
  const showNav = !hideNav && !selectedAppId && typeof onTabChange === 'function';

  return (
    <div className="flex items-center justify-center min-h-dvh overflow-x-hidden bg-canvas-inverse p-2 min-[420px]:p-[var(--cf-space-4)] font-sans">
      <div className="w-full max-w-[400px] h-[min(50rem,100dvh)] bg-canvas rounded-[1.75rem] shadow-cf-elevated overflow-hidden relative border-[6px] border-canvas-inverse flex flex-col min-h-0">
        <AndroidStatusBar />

        <div className="flex-1 relative min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={hideNav ? 'auth' : activeTab + (selectedAppId ?? '')}
              initial={reducedMotion ? false : {opacity: 0, y: 6}}
              animate={{opacity: 1, y: 0}}
              exit={reducedMotion ? {opacity: 0} : {opacity: 0, y: 4}}
              transition={{duration, ease: [0.2, 0.8, 0.2, 1]}}
              className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-canvas to-transparent"
            aria-hidden="true"
          />
        </div>

        {showNav ? (
          <nav
            aria-label="Primary"
            className="bg-surface border-t border-line-subtle shadow-cf-subtle grid grid-cols-5 px-1 pt-1 pb-1 shrink-0"
          >
            <NavIcon
              active={activeTab === 'dashboard'}
              onClick={() => onTabChange('dashboard')}
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
            />
            <NavIcon
              active={activeTab === 'apps'}
              onClick={() => onTabChange('apps')}
              icon={<Grid2X2 size={20} />}
              label="Apps"
            />
            <NavIcon
              active={activeTab === 'alerts'}
              onClick={() => onTabChange('alerts')}
              icon={<BellRing size={20} />}
              label="Alerts"
            />
            <NavIcon
              active={activeTab === 'analytics'}
              onClick={() => onTabChange('analytics')}
              icon={<ChartNoAxesCombined size={20} />}
              label="Analytics"
            />
            <NavIcon
              active={activeTab === 'settings'}
              onClick={() => onTabChange('settings')}
              icon={<Settings2 size={20} />}
              label="Settings"
            />
          </nav>
        ) : null}

        <div className="h-1.5 w-24 bg-line rounded-cf-pill mx-auto mb-2 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
};

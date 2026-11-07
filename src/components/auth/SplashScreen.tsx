import {useEffect} from 'react';
import {Shield} from 'lucide-react';

export const SplashScreen = ({onFinish}: {onFinish: () => void}) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className="h-full min-h-full flex flex-col items-center justify-center px-[var(--cf-page)] text-center"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bg-brand-soft text-brand rounded-cf-lg p-5 mb-6">
        <Shield size={48} aria-hidden="true" />
      </div>
      <h1 className="cf-page-title">Consentify</h1>
      <p className="cf-secondary mt-2">Your Privacy Control Center</p>
      <p className="cf-caption mt-8">Loading</p>
    </div>
  );
};

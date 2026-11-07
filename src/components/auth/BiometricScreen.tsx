import {Shield} from 'lucide-react';
import {EmailAuthForm} from './EmailAuthForm';

export const BiometricScreen = () => (
  <div className="cf-screen h-full min-h-full">
    <header className="text-center">
      <div className="inline-flex w-11 h-11 items-center justify-center rounded-cf-lg bg-brand-soft text-brand mb-4">
        <Shield size={22} aria-hidden="true" />
      </div>
      <h1 className="cf-page-title">Welcome Back</h1>
      <p className="cf-secondary mt-2">
        Sign in to access your privacy dashboard.
      </p>
    </header>

    <EmailAuthForm />

    <p className="cf-secondary text-center">
      Biometric unlock is not available in this web preview.
    </p>
  </div>
);

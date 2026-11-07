import {useState, type FormEvent} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {Button} from '../ui/Button';

type AuthMode = 'signin' | 'signup';

const FIELD_CLASS =
  'w-full min-h-11 bg-surface border border-line rounded-cf-md px-4 text-sm text-fg placeholder:text-fg-muted transition-[border-color,box-shadow] duration-[var(--cf-duration-fast)] ease-[var(--cf-ease)] focus:border-line-focus';

export const EmailAuthForm = () => {
  const {signIn, signUp} = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(trimmedEmail, password);
      } else {
        await signIn(trimmedEmail, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete sign-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div>
        <label htmlFor="consentify-email" className="cf-caption">
          Email
        </label>
        <input
          id="consentify-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'consentify-auth-error' : undefined}
          className={`${FIELD_CLASS} mt-1.5`}
        />
      </div>
      <div>
        <label htmlFor="consentify-password" className="cf-caption">
          Password
        </label>
        <input
          id="consentify-password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'consentify-auth-error' : undefined}
          className={`${FIELD_CLASS} mt-1.5`}
        />
      </div>

      {error ? (
        <p
          id="consentify-auth-error"
          className="cf-secondary text-danger bg-risk-high-soft border border-risk-high-ring rounded-cf-md px-4 py-3"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={switchMode}
      >
        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
      </Button>
    </form>
  );
};

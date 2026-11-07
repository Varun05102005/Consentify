import {useState} from 'react';
import {BellOff, Cloud, Download, Fingerprint, Loader2, LogOut, Shield} from 'lucide-react';
import {useAuth} from '../../hooks/useAuth';
import {useSettingsData} from '../../hooks/useSettingsData';
import {downloadPrivacyReport} from '../../services/privacyReport';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {ErrorState} from '../ui/ErrorState';
import {SectionHeader} from '../ui/SectionHeader';
import {AccountCard} from './AccountCard';
import {SettingsRow, SettingsStack} from './SettingsRow';

export function SettingsScreenView({
  email,
  displayName,
  isLoading,
  profileError,
  onRetryProfile,
  onExport,
  onLogOut,
  isExporting,
  isSigningOut,
  error,
  notice,
}: {
  email: string | null;
  displayName: string | null;
  isLoading: boolean;
  profileError: string | null;
  onRetryProfile: () => void;
  onExport: () => void;
  onLogOut: () => void;
  isExporting: boolean;
  isSigningOut: boolean;
  error: string | null;
  notice: string | null;
}) {
  return (
    <div className="cf-screen">
      <header>
        <p className="cf-caption">Settings</p>
        <h1 className="cf-page-title mt-1">Settings</h1>
        <p className="cf-secondary mt-2">
          Manage your Consentify account, privacy controls, and exported data.
        </p>
      </header>

      {profileError ? (
        <ErrorState message={profileError} onRetry={onRetryProfile} />
      ) : null}

      <AccountCard displayName={displayName} email={email} isLoading={isLoading} />

      <section>
        <SectionHeader
          title="Privacy & security"
          subtitle="Capabilities currently available in this web preview."
        />
        <Card className="mt-3" padding="sm">
          <SettingsStack>
            <SettingsRow
              icon={<Fingerprint size={18} />}
              label="Biometric unlock"
              caption="Not available in web preview"
            />
            <SettingsRow
              icon={<BellOff size={18} />}
              label="Notifications"
              caption="Not configured"
            />
            <SettingsRow
              icon={<Shield size={18} />}
              label="Privacy lock"
              caption="Not available"
            />
          </SettingsStack>
        </Card>
      </section>

      <section>
        <SectionHeader title="Your Data" />
        <Card className="mt-3" padding="sm">
          <SettingsStack>
            <SettingsRow
              icon={<Cloud size={18} />}
              label="Cloud sync"
              caption="Your connected data is already stored in Firebase."
            />
            <SettingsRow
              icon={<Download size={18} />}
              label="Export privacy report"
              caption="Download your current Consentify profile, applications, alerts, and derived metrics."
            />
          </SettingsStack>
          <Button
            variant="secondary"
            className="w-full mt-1"
            onClick={onExport}
            disabled={isExporting || isLoading}
            aria-busy={isExporting}
          >
            {isExporting ? (
              <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {isExporting ? 'Preparing download...' : 'Export privacy report'}
          </Button>
        </Card>
      </section>

      {notice ? (
        <p className="cf-secondary bg-surface border border-line-subtle rounded-cf-lg px-4 py-3" role="status">
          {notice}
        </p>
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <section>
        <SectionHeader title="About Consentify" />
        <Card className="mt-3">
          <p className="cf-card-title">Consentify</p>
          <p className="cf-secondary mt-1">Privacy permission risk analysis</p>
        </Card>
      </section>

      <div>
        <Button
          variant="ghost"
          className="w-full text-danger hover:bg-risk-high-soft"
          onClick={onLogOut}
          disabled={isSigningOut}
        >
          <LogOut size={16} aria-hidden="true" />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </div>
  );
}

export const SettingsScreen = () => {
  const {user, logOut} = useAuth();
  const {email, displayName, isLoading, error: profileError, refresh} = useSettingsData();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogOut = async () => {
    setError(null);
    setNotice(null);
    setIsSigningOut(true);
    try {
      await logOut();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Unable to log out. Please try again.');
      setIsSigningOut(false);
    }
  };

  const handleExport = async () => {
    if (!user) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsExporting(true);

    try {
      await downloadPrivacyReport(user.uid);
      setNotice('Privacy report downloaded.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export your report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingsScreenView
      email={email}
      displayName={displayName}
      isLoading={isLoading}
      profileError={profileError}
      onRetryProfile={() => { void refresh(); }}
      onExport={() => { void handleExport(); }}
      onLogOut={() => { void handleLogOut(); }}
      isExporting={isExporting}
      isSigningOut={isSigningOut}
      error={error}
      notice={notice}
    />
  );
};

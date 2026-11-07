import { useCallback, useEffect, useState } from 'react';
import { AlertsScreen } from './components/alerts/AlertsScreen';
import { AnalyticsScreen } from './components/analytics/AnalyticsScreen';
import { AppDetailsScreen } from './components/apps/AppDetailsScreen';
import { AppsScreen } from './components/apps/AppsScreen';
import { BiometricScreen } from './components/auth/BiometricScreen';
import { SplashScreen } from './components/auth/SplashScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { PhoneFrame } from './components/layout/PhoneFrame';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { AuthProvider, useAuth } from './hooks/useAuth';
import type { ActiveTab } from './types';

function AppContent() {
  const { user, isReady } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (!user) {
      setActiveTab('dashboard');
      setSelectedAppId(null);
    }
  }, [user]);

  if (!splashDone || !isReady) {
    return (
      <PhoneFrame hideNav>
        <SplashScreen onFinish={handleSplashFinish} />
      </PhoneFrame>
    );
  }

  if (!user) {
    return (
      <PhoneFrame hideNav>
        <BiometricScreen />
      </PhoneFrame>
    );
  }

  const renderContent = () => {
    if (selectedAppId) {
      return <AppDetailsScreen appId={selectedAppId} onBack={() => setSelectedAppId(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardScreen onNavigate={setActiveTab} />;
      case 'apps': return <AppsScreen onSelectApp={setSelectedAppId} />;
      case 'alerts': return <AlertsScreen onSelectApp={setSelectedAppId} />;
      case 'analytics': return <AnalyticsScreen />;
      case 'settings': return <SettingsScreen />;
      default: return <DashboardScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <PhoneFrame
      activeTab={activeTab}
      selectedAppId={selectedAppId}
      onTabChange={setActiveTab}
    >
      {renderContent()}
    </PhoneFrame>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

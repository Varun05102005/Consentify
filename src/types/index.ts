import type { RiskLevel } from './schema';

export type AppStep = 'splash' | 'auth' | 'main';

export type ActiveTab = 'dashboard' | 'apps' | 'alerts' | 'analytics' | 'settings';

export type {
  AlertStatus,
  AppCategory,
  AppConnectionStatus,
  AppPermission,
  ConsentifyMetrics,
  PermissionStatus,
  PermissionType,
  RiskLevel,
  UserAlert,
  UserApp,
} from './schema';

export type {
  AppRiskResult,
  PermissionRiskResult,
  RiskPermissionCategory,
  UserRiskResult,
} from './riskEngine';

export type {
  AiExplainAppRiskRequest,
  AiExplainPermission,
  AiExplanation,
  AiExplanationResult,
} from './aiExplanation';

/** Legacy list view model. Screens now use UserApp + calculated AppRiskResult. */
export interface AppInfo {
  id: string;
  name: string;
  icon: string;
  permissions: string[];
  risk: RiskLevel;
}

/** Legacy alert view model. Screens now use UserAlert. */
export interface Alert {
  id: string;
  title: string;
  app: string;
  permission: string;
  risk: RiskLevel;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

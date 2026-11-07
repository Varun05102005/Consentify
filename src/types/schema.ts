/**
 * Firestore domain model for Consentify.
 *
 * This is the source of truth for documents we will store later.
 * Hierarchy:
 *   users/{uid}
 *   users/{uid}/apps/{appId}      permissions live on this document
 *   users/{uid}/alerts/{alertId}
 *
 * Permissions are embedded on the app document (not a subcollection)
 * because the existing UI always loads an app together with its permissions.
 */

export type RiskLevel = 'High' | 'Medium' | 'Safe';

export type PermissionType =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'contacts'
  | 'storage'
  | 'photos'
  | 'notifications'
  | 'sensors'
  | 'other';

export type PermissionStatus = 'granted' | 'denied' | 'restricted' | 'unknown';

export type AppConnectionStatus = 'connected' | 'installed' | 'removed';

export type AlertStatus = 'open' | 'read' | 'resolved';

export type AppCategory =
  | 'tools'
  | 'social'
  | 'media'
  | 'productivity'
  | 'health'
  | 'other';

/** One permission granted/requested by an app. Stored inside the app document. */
export interface AppPermission {
  type: PermissionType;
  label: string;
  status: PermissionStatus;
  risk: RiskLevel;
  backgroundAccess: boolean;
  lastUsedAt: Date | null;
}

/**
 * users/{uid}/apps/{appId}
 *
 * Document ID:
 * - Android package name when known (e.g. com.android.calculator2)
 * - Firestore auto-id for manually connected / web-tracked apps
 */
export interface UserApp {
  id: string;
  ownerUid: string;
  name: string;
  packageName: string | null;
  category: AppCategory;
  icon: string;
  status: AppConnectionStatus;
  risk: RiskLevel;
  permissions: AppPermission[];
  lastScannedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * users/{uid}/alerts/{alertId}
 *
 * Document ID: Firestore auto-id.
 * appName / permissionLabel are denormalized so the alerts list
 * does not need a join, matching the current Alert view model.
 */
export interface UserAlert {
  id: string;
  ownerUid: string;
  appId: string;
  appName: string;
  permissionType: PermissionType | null;
  permissionLabel: string | null;
  title: string;
  description: string;
  severity: RiskLevel;
  status: AlertStatus;
  createdAt: Date | null;
  readAt: Date | null;
  resolvedAt: Date | null;
}

/**
 * Values the dashboard/analytics screens show today as hardcoded numbers.
 * These are computed from UserApp[] + UserAlert[], never stored.
 */
export interface ConsentifyMetrics {
  totalApps: number;
  highRiskApps: number;
  mediumRiskApps: number;
  safeApps: number;
  openAlerts: number;
  privacyScore: number;
  permissionUsage: Array<{
    type: PermissionType;
    label: string;
    appCount: number;
  }>;
}

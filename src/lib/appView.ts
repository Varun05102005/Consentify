import type {
  AlertStatus,
  AppConnectionStatus,
  AppInfo,
  AppPermission,
  PermissionStatus,
  UserAlert,
  UserApp,
} from '../types';
import {calculateAppRisk} from './riskEngine';

export function formatCategory(category: UserApp['category']): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function formatAppStatus(status: AppConnectionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatPermissionStatus(status: PermissionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatAlertStatus(status: AlertStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function alertDescription(alert: UserAlert): string {
  const stored = alert.description.trim();
  if (stored) {
    return stored;
  }

  if (alert.permissionLabel) {
    return `${alert.appName} · ${alert.permissionLabel}`;
  }

  return alert.appName;
}

export function formatRelativeTime(date: Date | null): string {
  if (!date) {
    return '';
  }

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes === 1) {
    return '1 min ago';
  }
  if (minutes < 60) {
    return `${minutes} mins ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours === 1) {
    return '1 hour ago';
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  return `${days} days ago`;
}

export function permissionCaption(permission: {
  status: PermissionStatus;
  backgroundAccess: boolean;
  lastUsedAt: Date | null;
}): string {
  const parts = [formatPermissionStatus(permission.status)];
  if (permission.backgroundAccess) {
    parts.push('Background');
  }

  const lastUsed = formatRelativeTime(permission.lastUsedAt);
  if (lastUsed) {
    parts.push(`Used ${lastUsed}`);
  }

  return parts.join(' · ');
}

export function permissionLabels(app: UserApp): string[] {
  return app.permissions
    .map((permission) => permission.label.trim())
    .filter((label) => label.length > 0);
}

/** Compact permission counts for application cards. Only includes statuses that exist. */
export function permissionStatusSummary(permissions: AppPermission[]): string {
  const total = permissions.length;
  if (total === 0) {
    return 'No permissions recorded';
  }

  const parts = [`${total} permission${total === 1 ? '' : 's'}`];
  const granted = permissions.filter((permission) => permission.status === 'granted').length;
  const unknown = permissions.filter((permission) => permission.status === 'unknown').length;
  const restricted = permissions.filter((permission) => permission.status === 'restricted').length;
  const denied = permissions.filter((permission) => permission.status === 'denied').length;

  if (granted > 0) {
    parts.push(`${granted} granted`);
  }
  if (unknown > 0) {
    parts.push(`${unknown} unknown`);
  }
  if (restricted > 0) {
    parts.push(`${restricted} restricted`);
  }
  if (denied > 0) {
    parts.push(`${denied} denied`);
  }

  return parts.join(' · ');
}

/** True when the stored icon is an image source, not an emoji or blank placeholder. */
export function isStoredImageIcon(icon: string): boolean {
  const value = icon.trim();
  return /^(data:image\/|https?:\/\/|blob:)/i.test(value);
}

export function appInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, '').charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return letters;
}

/** Existing list subtitle slot: permission labels, or category when none are recorded. */
export function appListSubtitle(app: UserApp): string {
  const labels = permissionLabels(app);
  if (labels.length > 0) {
    return labels.join(', ');
  }

  return formatCategory(app.category);
}

/** Maps a Firestore UserApp into the AppInfo view model. Risk is calculated. */
export function userAppToAppInfo(app: UserApp): AppInfo {
  return {
    id: app.id,
    name: app.name,
    icon: app.icon,
    permissions: permissionLabels(app),
    risk: calculateAppRisk(app).riskLevel,
  };
}

import type {
  AlertStatus,
  AppCategory,
  AppConnectionStatus,
  AppPermission,
  PermissionStatus,
  PermissionType,
  RiskLevel,
} from '../types';
import {toDate} from '../lib/timestamps';

const RISK_LEVELS: RiskLevel[] = ['High', 'Medium', 'Safe'];
const PERMISSION_TYPES: PermissionType[] = [
  'camera',
  'microphone',
  'location',
  'contacts',
  'storage',
  'photos',
  'notifications',
  'sensors',
  'other',
];
const PERMISSION_STATUSES: PermissionStatus[] = ['granted', 'denied', 'restricted', 'unknown'];
const APP_STATUSES: AppConnectionStatus[] = ['connected', 'installed', 'removed'];
const APP_CATEGORIES: AppCategory[] = ['tools', 'social', 'media', 'productivity', 'health', 'other'];
const ALERT_STATUSES: AlertStatus[] = ['open', 'read', 'resolved'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function toAppPermission(value: unknown): AppPermission | null {
  const data = asRecord(value);
  if (!data) {
    return null;
  }

  const type = oneOf(data.type, PERMISSION_TYPES, 'other');
  const label = asString(data.label, type);

  return {
    type,
    label,
    status: oneOf(data.status, PERMISSION_STATUSES, 'unknown'),
    risk: oneOf(data.risk, RISK_LEVELS, 'Medium'),
    backgroundAccess: asBoolean(data.backgroundAccess),
    lastUsedAt: toDate(data.lastUsedAt),
  };
}

export function serializePermissions(permissions: AppPermission[]): Record<string, unknown>[] {
  return permissions.map((permission) => ({
    type: permission.type,
    label: permission.label,
    status: permission.status,
    risk: permission.risk,
    backgroundAccess: permission.backgroundAccess,
    lastUsedAt: permission.lastUsedAt,
  }));
}

export function readAppFields(data: unknown) {
  const raw = asRecord(data) ?? {};

  return {
    name: asString(raw.name, 'Untitled app'),
    packageName: asNullableString(raw.packageName),
    category: oneOf(raw.category, APP_CATEGORIES, 'other'),
    icon: asString(raw.icon, ''),
    status: oneOf(raw.status, APP_STATUSES, 'connected'),
    risk: oneOf(raw.risk, RISK_LEVELS, 'Medium'),
    permissions: Array.isArray(raw.permissions)
      ? raw.permissions.map(toAppPermission).filter((permission): permission is AppPermission => permission !== null)
      : [],
    lastScannedAt: toDate(raw.lastScannedAt),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function readAlertFields(data: unknown) {
  const raw = asRecord(data) ?? {};

  return {
    appId: asString(raw.appId),
    appName: asString(raw.appName, 'Unknown app'),
    permissionType:
      raw.permissionType == null ? null : oneOf(raw.permissionType, PERMISSION_TYPES, 'other'),
    permissionLabel: asNullableString(raw.permissionLabel),
    title: asString(raw.title, 'Alert'),
    description: asString(raw.description),
    severity: oneOf(raw.severity, RISK_LEVELS, 'Medium'),
    status: oneOf(raw.status, ALERT_STATUSES, 'open'),
    createdAt: toDate(raw.createdAt),
    readAt: toDate(raw.readAt),
    resolvedAt: toDate(raw.resolvedAt),
  };
}

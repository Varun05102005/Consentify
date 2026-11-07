package com.consentify.app.scanner

data class ScannedPermissionFact(
    val consentifyType: PermissionType,
    val label: String,
    val status: PermissionStatus,
    val backgroundAccess: Boolean,
)

data class ScannedApp(
    val packageName: String,
    val appName: String,
    val versionName: String? = null,
    val versionCode: Long? = null,
    val permissions: List<ScannedPermissionFact>,
)

data class ScanResult(
    val apps: List<ScannedApp>,
    val scannedAtEpochMs: Long,
    val sdkInt: Int,
    val discoveredLauncherCount: Int,
    val skippedSystemCount: Int,
    val skippedNonLauncherCount: Int,
)

data class DiscoveredPackage(
    val packageName: String,
    val appName: String,
    val versionName: String? = null,
    val versionCode: Long? = null,
    val isSystem: Boolean,
    val isLauncher: Boolean,
)

data class RawAndroidPermission(
    val name: String,
    val requested: Boolean = true,
    val grantEvidence: GrantEvidence,
)

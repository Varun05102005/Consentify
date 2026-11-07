package com.consentify.app.scanner

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build

/**
 * Reads declared permissions for a visible package.
 *
 * Grant evidence comes from `requestedPermissionsFlags` and
 * `PackageManager.checkPermission`. AppOps-style permissions are never
 * treated as granted/denied from `checkPermission`.
 */
class AndroidPermissionInspector(
    private val packageManager: PackageManager,
) : PermissionInspector {
    override fun inspect(packageName: String): List<RawAndroidPermission> {
        val info = try {
            packageInfo(packageName)
        } catch (_: PackageManager.NameNotFoundException) {
            return emptyList()
        }

        val requested = info.requestedPermissions ?: return emptyList()
        val flags = info.requestedPermissionsFlags
        val result = ArrayList<RawAndroidPermission>(requested.size)

        for (index in requested.indices) {
            val name = requested[index] ?: continue
            val grantedByFlag = flags != null &&
                index < flags.size &&
                flags[index] and PackageInfo.REQUESTED_PERMISSION_GRANTED != 0
            val grantedByCheck = packageManager.checkPermission(name, packageName) ==
                PackageManager.PERMISSION_GRANTED
            result += RawAndroidPermission(
                name = name,
                requested = true,
                grantEvidence = evidence(name, grantedByFlag, grantedByCheck),
            )
        }

        return result
    }

    private fun evidence(
        name: String,
        grantedByFlag: Boolean,
        grantedByCheck: Boolean,
    ): GrantEvidence {
        if (name in APP_OPS_UNRELIABLE) {
            return GrantEvidence.UNKNOWN
        }
        if (grantedByFlag || grantedByCheck) {
            return GrantEvidence.GRANTED
        }
        return GrantEvidence.DENIED
    }

    private fun packageInfo(packageName: String): PackageInfo {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager.getPackageInfo(
                packageName,
                PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong()),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManager.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
        }
    }

    companion object {
        private val APP_OPS_UNRELIABLE = setOf(
            AndroidPermissionNames.MANAGE_EXTERNAL_STORAGE,
            AndroidPermissionNames.SYSTEM_ALERT_WINDOW,
            AndroidPermissionNames.PACKAGE_USAGE_STATS,
            AndroidPermissionNames.REQUEST_INSTALL_PACKAGES,
        )
    }
}

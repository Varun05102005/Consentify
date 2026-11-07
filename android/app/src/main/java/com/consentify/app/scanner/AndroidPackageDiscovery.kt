package com.consentify.app.scanner

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build

/**
 * Discovers user-facing launcher applications through PackageManager.
 *
 * Uses `ACTION_MAIN` + `CATEGORY_LAUNCHER` only. Does not use
 * `QUERY_ALL_PACKAGES` or `PACKAGE_USAGE_STATS`.
 */
class AndroidPackageDiscovery(
    private val packageManager: PackageManager,
) : PackageDiscovery {
    override fun discoverLauncherApps(): List<DiscoveredPackage> {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val resolved = queryLauncherActivities(intent)
        val unique = LinkedHashMap<String, DiscoveredPackage>()

        for (info in resolved) {
            val applicationInfo = info.activityInfo?.applicationInfo ?: continue
            val packageName = applicationInfo.packageName ?: continue
            if (unique.containsKey(packageName)) continue

            val appName = info.loadLabel(packageManager)?.toString()
                .orEmpty()
                .ifBlank { packageName }
            val version = readVersion(packageName)

            unique[packageName] = DiscoveredPackage(
                packageName = packageName,
                appName = appName,
                versionName = version.first,
                versionCode = version.second,
                isSystem = applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM != 0,
                isLauncher = true,
            )
        }

        return unique.values.toList()
    }

    private fun queryLauncherActivities(intent: Intent): List<ResolveInfo> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager.queryIntentActivities(
                intent,
                PackageManager.ResolveInfoFlags.of(0),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManager.queryIntentActivities(intent, 0)
        }
    }

    private fun readVersion(packageName: String): Pair<String?, Long?> {
        val info = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(0),
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, 0)
            }
        } catch (_: PackageManager.NameNotFoundException) {
            return null to null
        }

        val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.longVersionCode
        } else {
            @Suppress("DEPRECATION")
            info.versionCode.toLong()
        }
        return info.versionName to versionCode
    }
}

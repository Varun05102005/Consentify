package com.consentify.app.scanner

/**
 * v1 discovery policy.
 *
 * Include: user-facing launcher applications (`CATEGORY_LAUNCHER`) that are
 * not marked [android.content.pm.ApplicationInfo.FLAG_SYSTEM].
 *
 * Skip: any package with `FLAG_SYSTEM`, including updated system apps
 * (`FLAG_SYSTEM | FLAG_UPDATED_SYSTEM_APP`). There is no exception for
 * vendor-preloaded launchers in v1.
 *
 * Do not skip: user-installed apps that merely depend on vendor/system
 * libraries. Those apps do not have `FLAG_SYSTEM`.
 *
 * Visibility: only packages Android returns from the launcher query are
 * considered. Missing packages are not invented.
 */
object ScanPolicy {
    fun include(discovered: DiscoveredPackage): Boolean {
        return discovered.isLauncher && !discovered.isSystem
    }
}

package com.consentify.app.scanner

/**
 * Local scanner orchestrator. Discovery and inspection are injected so JVM
 * tests can run without PackageManager or a device.
 */
class PermissionScanner(
    private val discovery: PackageDiscovery,
    private val inspector: PermissionInspector,
    private val mapper: PermissionMapper = PermissionMapper(),
    private val sdkInt: Int,
    private val clock: () -> Long = { System.currentTimeMillis() },
) {
    fun scan(): ScanResult {
        val discovered = discovery.discoverLauncherApps()
        var skippedSystem = 0
        var skippedNonLauncher = 0
        val apps = ArrayList<ScannedApp>()

        for (pkg in discovered) {
            if (!pkg.isLauncher) {
                skippedNonLauncher += 1
                continue
            }
            if (pkg.isSystem) {
                skippedSystem += 1
                continue
            }
            val facts = mapper.map(inspector.inspect(pkg.packageName), sdkInt)
            apps += ScannedApp(
                packageName = pkg.packageName,
                appName = pkg.appName,
                versionName = pkg.versionName,
                versionCode = pkg.versionCode,
                permissions = facts,
            )
        }

        return ScanResult(
            apps = apps,
            scannedAtEpochMs = clock(),
            sdkInt = sdkInt,
            discoveredLauncherCount = discovered.count { it.isLauncher },
            skippedSystemCount = skippedSystem,
            skippedNonLauncherCount = skippedNonLauncher,
        )
    }
}

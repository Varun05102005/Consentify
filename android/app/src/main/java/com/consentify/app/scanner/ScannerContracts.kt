package com.consentify.app.scanner

fun interface PackageDiscovery {
    fun discoverLauncherApps(): List<DiscoveredPackage>
}

fun interface PermissionInspector {
    fun inspect(packageName: String): List<RawAndroidPermission>
}

fun interface AppScanner {
    suspend fun scan(): ScanResult
}

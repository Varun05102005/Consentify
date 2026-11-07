package com.consentify.app.scanner

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScanPolicyTest {
    @Test
    fun launcherUserAppIsIncluded() {
        assertTrue(ScanPolicy.include(pkg(isSystem = false, isLauncher = true)))
    }

    @Test
    fun systemApplicationIsFiltered() {
        assertFalse(ScanPolicy.include(pkg(isSystem = true, isLauncher = true)))
    }

    @Test
    fun nonLauncherApplicationIsExcluded() {
        assertFalse(ScanPolicy.include(pkg(isSystem = false, isLauncher = false)))
    }

    private fun pkg(isSystem: Boolean, isLauncher: Boolean) = DiscoveredPackage(
        packageName = "com.example.app",
        appName = "Example",
        isSystem = isSystem,
        isLauncher = isLauncher,
    )
}

class PermissionScannerTest {
    @Test
    fun launcherApplicationIsDiscovered() {
        val result = scan(
            discovered = listOf(userLauncher("com.example.maps", "Maps")),
            permissions = mapOf(
                "com.example.maps" to listOf(
                    RawAndroidPermission(
                        AndroidPermissionNames.ACCESS_FINE_LOCATION,
                        true,
                        GrantEvidence.GRANTED,
                    ),
                ),
            ),
        )
        assertEquals(1, result.apps.size)
        assertEquals("com.example.maps", result.apps.single().packageName)
        assertEquals("Maps", result.apps.single().appName)
        assertEquals(1, result.discoveredLauncherCount)
        assertEquals(0, result.skippedSystemCount)
    }

    @Test
    fun systemApplicationIsFilteredFromPayload() {
        val result = scan(
            discovered = listOf(
                userLauncher("com.example.chat", "Chat"),
                DiscoveredPackage(
                    packageName = "com.android.settings",
                    appName = "Settings",
                    isSystem = true,
                    isLauncher = true,
                ),
            ),
            permissions = emptyMap(),
        )
        assertEquals(listOf("com.example.chat"), result.apps.map { it.packageName })
        assertEquals(1, result.skippedSystemCount)
        assertEquals(2, result.discoveredLauncherCount)
    }

    @Test
    fun nonLauncherApplicationIsExcluded() {
        val result = scan(
            discovered = listOf(
                userLauncher("com.example.chat", "Chat"),
                DiscoveredPackage(
                    packageName = "com.example.hidden",
                    appName = "Hidden",
                    isSystem = false,
                    isLauncher = false,
                ),
            ),
            permissions = emptyMap(),
        )
        assertEquals(listOf("com.example.chat"), result.apps.map { it.packageName })
        assertEquals(1, result.skippedNonLauncherCount)
    }

    @Test
    fun payloadContainsNoScoresUidOrCredentials() {
        val result = scan(
            discovered = listOf(userLauncher("com.example.chat", "Chat")),
            permissions = mapOf(
                "com.example.chat" to listOf(
                    RawAndroidPermission(
                        AndroidPermissionNames.CAMERA,
                        true,
                        GrantEvidence.GRANTED,
                    ),
                ),
            ),
        )
        val text = result.toString()
        assertFalse(text.contains("riskScore"))
        assertFalse(text.contains("privacyScore"))
        assertFalse(text.contains("riskLevel"))
        assertFalse(text.contains("uid="))
        assertFalse(text.contains("password"))
        assertFalse(text.contains("idToken"))
        assertFalse(text.contains("credential"))
        val app = result.apps.single()
        assertEquals("com.example.chat", app.packageName)
        assertTrue(app.permissions.none { it.label.contains("android.permission") })
    }

    @Test
    fun scannerUsesInjectedClockAndSdk() {
        val result = scan(
            discovered = listOf(userLauncher("com.example.chat", "Chat")),
            permissions = emptyMap(),
            sdkInt = 32,
            now = 42L,
        )
        assertEquals(32, result.sdkInt)
        assertEquals(42L, result.scannedAtEpochMs)
    }

    private fun scan(
        discovered: List<DiscoveredPackage>,
        permissions: Map<String, List<RawAndroidPermission>>,
        sdkInt: Int = 34,
        now: Long = 1_700_000_000_000L,
    ): ScanResult {
        return PermissionScanner(
            discovery = PackageDiscovery { discovered },
            inspector = PermissionInspector { permissions[it].orEmpty() },
            mapper = PermissionMapper(),
            sdkInt = sdkInt,
            clock = { now },
        ).scan()
    }

    private fun userLauncher(packageName: String, appName: String) = DiscoveredPackage(
        packageName = packageName,
        appName = appName,
        versionName = "1.0",
        versionCode = 1L,
        isSystem = false,
        isLauncher = true,
    )
}

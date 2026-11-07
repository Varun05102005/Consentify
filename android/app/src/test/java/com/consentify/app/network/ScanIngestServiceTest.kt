package com.consentify.app.network

import com.consentify.app.scanner.PermissionStatus
import com.consentify.app.scanner.PermissionType
import com.consentify.app.scanner.ScannedApp
import com.consentify.app.scanner.ScannedPermissionFact
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScanIngestServiceTest {
    private val sampleApps = listOf(
        ScannedApp(
            packageName = "com.example.maps",
            appName = "Maps",
            versionName = "9.1",
            versionCode = 91L,
            permissions = listOf(
                ScannedPermissionFact(
                    consentifyType = PermissionType.LOCATION,
                    label = "Location",
                    status = PermissionStatus.GRANTED,
                    backgroundAccess = true,
                ),
            ),
        ),
    )

    @Test
    fun payloadContainsOnlyAllowedFields() {
        val payload = serializeScanPayload(sampleApps)
        assertEquals(setOf("apps"), payload.keys)
        @Suppress("UNCHECKED_CAST")
        val app = (payload["apps"] as List<Map<String, Any>>).single()
        assertEquals(setOf("packageName", "appName", "permissions"), app.keys)
        @Suppress("UNCHECKED_CAST")
        val permission = (app["permissions"] as List<Map<String, Any>>).single()
        assertEquals(setOf("consentifyType", "label", "status", "backgroundAccess"), permission.keys)
        assertEquals("com.example.maps", app["packageName"])
        assertEquals("Maps", app["appName"])
        assertEquals("location", permission["consentifyType"])
        assertEquals("Location", permission["label"])
        assertEquals("granted", permission["status"])
        assertEquals(true, permission["backgroundAccess"])
    }

    @Test
    fun payloadOmitsRiskIdentityAndVersionFields() {
        val payload = serializeScanPayload(sampleApps)
        val text = payload.toString()
        assertFalse(text.contains("riskScore"))
        assertFalse(text.contains("riskLevel"))
        assertFalse(text.contains("privacyScore"))
        assertFalse(text.contains("uid"))
        assertFalse(text.contains("password"))
        assertFalse(text.contains("token"))
        assertFalse(text.contains("versionName"))
        assertFalse(text.contains("versionCode"))
        assertFalse(text.contains("9.1"))
        assertFalse(text.contains("ownerUid"))
        assertFalse(text.contains("users/"))
        assertFalse(text.contains("icon"))
        assertFalse(text.contains("IMEI"))
        assertFalse(text.contains("androidId"))
        assertFalse(text.contains("android_id"))
        assertFalse(text.contains("AdvertisingId"))
    }

    @Test
    fun unauthenticatedClientDoesNotCallBackend() = runTest {
        var called = false
        val service = ScanIngestService(
            currentUid = { null },
            caller = {
                called = true
                emptyMap()
            },
        )
        try {
            service.ingest(sampleApps)
            throw AssertionError("expected unauthenticated failure")
        } catch (error: IngestException) {
            assertEquals("unauthenticated", error.code)
            assertEquals(IngestMessages.UNAUTHENTICATED, error.message)
        }
        assertFalse(called)
    }

    @Test
    fun backendSuccessIsHandled() = runTest {
        var received: Map<String, Any>? = null
        val service = ScanIngestService(
            currentUid = { "verified-uid" },
            caller = { payload ->
                received = payload
                mapOf("writtenAppCount" to 1)
            },
        )
        val result = service.ingest(sampleApps)
        assertEquals(1, result.writtenAppCount)
        assertEquals(1, result.uploadedCount)
        assertEquals(0, result.markedRemovedCount)
        assertEquals(0, result.restoredCount)
        assertEquals(setOf("apps"), received?.keys)
        assertFalse(received.toString().contains("verified-uid"))
    }

    @Test
    fun backendSyncCountsAreParsed() = runTest {
        val service = ScanIngestService(
            currentUid = { "verified-uid" },
            caller = {
                mapOf(
                    "writtenAppCount" to 2,
                    "uploadedCount" to 2,
                    "markedRemovedCount" to 4,
                    "restoredCount" to 1,
                )
            },
        )
        val result = service.ingest(sampleApps)
        assertEquals(2, result.writtenAppCount)
        assertEquals(2, result.uploadedCount)
        assertEquals(4, result.markedRemovedCount)
        assertEquals(1, result.restoredCount)
    }

    @Test
    fun backendErrorIsNormalized() = runTest {
        val service = ScanIngestService(
            currentUid = { "verified-uid" },
            caller = { throw RuntimeException("internal: stack dump with token=secret") },
        )
        try {
            service.ingest(sampleApps)
            throw AssertionError("expected normalized failure")
        } catch (error: IngestException) {
            assertEquals("internal", error.code)
            assertEquals(IngestMessages.GENERIC, error.message)
            assertFalse(error.message.contains("token"))
            assertFalse(error.message.contains("stack"))
        }
    }

    @Test
    fun invalidArgumentIsNormalized() {
        val message = ingestErrorMessage(RuntimeException("INVALID_ARGUMENT: boom"))
        assertEquals(IngestMessages.INVALID, message)
        assertEquals("invalid-argument", normalizeIngestCode(RuntimeException("code=invalid-argument")))
    }
}

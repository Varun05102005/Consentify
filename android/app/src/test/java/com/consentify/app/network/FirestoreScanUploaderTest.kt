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

class FirestoreScanUploaderTest {
    private val serverTs = "SERVER_TIMESTAMP"

    @Test
    fun signedOutUploadIsRejected() = runTest {
        val store = MemoryAppScanStore()
        val uploader = uploader(uid = null, store = store)
        try {
            uploader.ingest(listOf(mapsApp()))
            throw AssertionError("expected unauthenticated failure")
        } catch (error: IngestException) {
            assertEquals("unauthenticated", error.code)
            assertEquals(IngestMessages.UNAUTHENTICATED, error.message)
        }
        assertTrue(store.commits.isEmpty())
        assertEquals(0, store.listCalls)
    }

    @Test
    fun authenticatedUploadUsesAuthenticatedUidAndPackageDocumentId() = runTest {
        val store = MemoryAppScanStore()
        val result = uploader(uid = "verified-uid", store = store).ingest(listOf(mapsApp()))
        assertEquals(1, result.uploadedCount)
        assertEquals(1, result.writtenAppCount)
        val write = store.writes.single()
        assertEquals("verified-uid", write.uid)
        assertEquals("com.example.maps", write.packageName)
        assertEquals("verified-uid", write.data["ownerUid"])
        assertEquals("com.example.maps", write.data["packageName"])
        assertEquals("installed", write.data["status"])
        assertEquals("Maps", write.data["name"])
    }

    @Test
    fun newAppBecomesInstalled() = runTest {
        val store = MemoryAppScanStore()
        uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals("installed", store.doc("user-1", "com.example.maps")?.get("status"))
    }

    @Test
    fun existingInstalledAppRemainsInstalled() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.maps", installed("com.example.maps", createdAt = "OLD_CREATED"))
        val result = uploader(store = store).ingest(listOf(mapsApp(appName = "Maps Reloaded")))
        assertEquals(0, result.markedRemovedCount)
        assertEquals(0, result.restoredCount)
        val written = store.doc("user-1", "com.example.maps")!!
        assertEquals("installed", written["status"])
        assertEquals("Maps Reloaded", written["name"])
        assertEquals("OLD_CREATED", written["createdAt"])
        assertEquals(serverTs, written["updatedAt"])
        assertEquals(serverTs, written["lastScannedAt"])
    }

    @Test
    fun missingInstalledAppBecomesRemoved() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.maps", installed("com.example.maps"))
        store.seed("user-1", "com.example.camera", installed("com.example.camera", name = "Camera"))
        val result = uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals(1, result.uploadedCount)
        assertEquals(1, result.markedRemovedCount)
        assertEquals("installed", store.doc("user-1", "com.example.maps")?.get("status"))
        val camera = store.doc("user-1", "com.example.camera")!!
        assertEquals("removed", camera["status"])
        assertEquals("OLD_CREATED", camera["createdAt"])
        assertEquals("Camera", camera["name"])
        assertEquals(serverTs, camera["updatedAt"])
        assertTrue(store.docs.containsKey("user-1/com.example.camera"))
    }

    @Test
    fun previouslyRemovedAppStaysRemovedWhenAbsent() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.maps", installed("com.example.maps"))
        store.seed(
            "user-1",
            "com.example.camera",
            installed("com.example.camera", name = "Camera", status = "removed", updatedAt = "OLD_UPDATED"),
        )
        val result = uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals(0, result.markedRemovedCount)
        val camera = store.doc("user-1", "com.example.camera")!!
        assertEquals("removed", camera["status"])
        assertEquals("OLD_UPDATED", camera["updatedAt"])
    }

    @Test
    fun previouslyRemovedAppIsRestoredWhenScannedAgain() = runTest {
        val store = MemoryAppScanStore()
        store.seed(
            "user-1",
            "com.example.maps",
            installed("com.example.maps", name = "Old Maps", status = "removed"),
        )
        val result = uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals(1, result.restoredCount)
        assertEquals(0, result.markedRemovedCount)
        val maps = store.doc("user-1", "com.example.maps")!!
        assertEquals("installed", maps["status"])
        assertEquals("Maps", maps["name"])
        assertEquals("OLD_CREATED", maps["createdAt"])
    }

    @Test
    fun emptyScanPerformsNoWritesAndDoesNotListApps() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.maps", installed("com.example.maps"))
        val result = uploader(store = store).ingest(emptyList())
        assertEquals(0, result.uploadedCount)
        assertEquals(0, result.markedRemovedCount)
        assertEquals(0, store.listCalls)
        assertTrue(store.commits.isEmpty())
        assertEquals("installed", store.doc("user-1", "com.example.maps")?.get("status"))
    }

    @Test
    fun riskScoreAndPrivacyScoreAreNeverWritten() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.camera", installed("com.example.camera"))
        uploader(store = store).ingest(listOf(mapsApp()))
        for (write in store.writes) {
            val text = write.data.toString()
            assertFalse(text.contains("riskScore"))
            assertFalse(text.contains("privacyScore"))
            assertFalse(text.contains("riskLevel"))
            assertFalse(write.data.containsKey("risk"))
        }
    }

    @Test
    fun uploadFailureIsReportedAndDoesNotLookSuccessful() = runTest {
        val store = MemoryAppScanStore()
        store.failWrite = true
        try {
            uploader(store = store).ingest(listOf(mapsApp()))
            throw AssertionError("expected upload failure")
        } catch (error: IngestException) {
            assertEquals("internal", error.code)
            assertEquals(IngestMessages.GENERIC, error.message)
            assertFalse(error.message.contains("stack"))
        }
    }

    @Test
    fun multipleBatchesAreCommittedInOrder() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.notes", installed("com.example.notes"))
        val result = uploader(store = store, chunk = 1).ingest(
            listOf(mapsApp(), cameraApp()),
        )
        assertEquals(2, result.uploadedCount)
        assertEquals(1, result.markedRemovedCount)
        assertEquals(3, store.commits.size)
        assertEquals(listOf("com.example.maps"), store.commits[0].map { it.packageName })
        assertEquals(listOf("com.example.camera"), store.commits[1].map { it.packageName })
        assertEquals(listOf("com.example.notes"), store.commits[2].map { it.packageName })
    }

    @Test
    fun failedLaterBatchReportsFailure() = runTest {
        val store = MemoryAppScanStore()
        store.failWriteOnCommit = 2
        try {
            uploader(store = store, chunk = 1).ingest(listOf(mapsApp(), cameraApp()))
            throw AssertionError("expected batch failure")
        } catch (error: IngestException) {
            assertEquals("internal", error.code)
        }
        assertEquals(1, store.commits.size)
    }

    @Test
    fun serverTimestampsAreUsedForNewDocuments() = runTest {
        val store = MemoryAppScanStore()
        uploader(store = store).ingest(listOf(mapsApp()))
        val written = store.doc("user-1", "com.example.maps")!!
        assertEquals(serverTs, written["createdAt"])
        assertEquals(serverTs, written["updatedAt"])
        assertEquals(serverTs, written["lastScannedAt"])
    }

    @Test
    fun webAutoIdDocumentsAreNotMarkedRemoved() = runTest {
        val store = MemoryAppScanStore()
        store.seed(
            "user-1",
            "autoIdWebApp",
            mapOf(
                "ownerUid" to "user-1",
                "name" to "Web App",
                "packageName" to null,
                "status" to "connected",
                "createdAt" to "WEB_CREATED",
            ),
        )
        store.seed("user-1", "com.example.camera", installed("com.example.camera", name = "Camera"))
        val result = uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals(1, result.markedRemovedCount)
        assertEquals("connected", store.doc("user-1", "autoIdWebApp")?.get("status"))
        assertEquals("removed", store.doc("user-1", "com.example.camera")?.get("status"))
    }

    @Test
    fun synchronizationIsIdempotent() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-1", "com.example.maps", installed("com.example.maps"))
        store.seed("user-1", "com.example.camera", installed("com.example.camera", name = "Camera"))
        val first = uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals(1, first.markedRemovedCount)
        val second = uploader(store = store).ingest(listOf(mapsApp()))
        assertEquals(1, second.uploadedCount)
        assertEquals(0, second.markedRemovedCount)
        assertEquals(0, second.restoredCount)
        assertEquals("removed", store.doc("user-1", "com.example.camera")?.get("status"))
        assertEquals("OLD_CREATED", store.doc("user-1", "com.example.camera")?.get("createdAt"))
    }

    @Test
    fun permissionsAreEngineCompatibleAndOmitAndroidPermissionNames() = runTest {
        val store = MemoryAppScanStore()
        uploader(store = store).ingest(listOf(mapsApp()))
        val permissions = store.doc("user-1", "com.example.maps")?.get("permissions") as List<*>
        assertEquals(
            listOf(
                mapOf(
                    "type" to "location",
                    "label" to "Location",
                    "status" to "granted",
                    "backgroundAccess" to true,
                    "lastUsedAt" to null,
                ),
            ),
            permissions,
        )
        assertFalse(store.writes.single().data.toString().contains("android.permission"))
    }

    @Test
    fun anotherUsersDocumentsAreNotListedOrWritten() = runTest {
        val store = MemoryAppScanStore()
        store.seed("user-2", "com.example.other", installed("com.example.other"))
        store.seed("user-1", "com.example.camera", installed("com.example.camera", name = "Camera"))
        val result = uploader(uid = "user-1", store = store).ingest(listOf(mapsApp()))
        assertEquals(1, result.markedRemovedCount)
        assertEquals("installed", store.doc("user-2", "com.example.other")?.get("status"))
        assertTrue(store.writes.all { it.uid == "user-1" })
    }

    private fun uploader(
        uid: String? = "user-1",
        store: MemoryAppScanStore,
        chunk: Int = FIRESTORE_WRITE_CHUNK,
    ): FirestoreScanUploader {
        return FirestoreScanUploader(
            currentUid = { uid },
            store = store,
            serverTimestamp = { serverTs },
            writeChunkSize = chunk,
        )
    }

    private fun mapsApp(appName: String = "Maps"): ScannedApp {
        return ScannedApp(
            packageName = "com.example.maps",
            appName = appName,
            permissions = listOf(
                ScannedPermissionFact(
                    consentifyType = PermissionType.LOCATION,
                    label = "Location",
                    status = PermissionStatus.GRANTED,
                    backgroundAccess = true,
                ),
            ),
        )
    }

    private fun cameraApp(): ScannedApp {
        return ScannedApp(
            packageName = "com.example.camera",
            appName = "Camera",
            permissions = listOf(
                ScannedPermissionFact(
                    consentifyType = PermissionType.CAMERA,
                    label = "Camera",
                    status = PermissionStatus.GRANTED,
                    backgroundAccess = false,
                ),
            ),
        )
    }

    private fun installed(
        packageName: String,
        name: String = packageName,
        status: String = "installed",
        createdAt: String = "OLD_CREATED",
        updatedAt: String = "OLD_UPDATED",
    ): Map<String, Any?> {
        return mapOf(
            "ownerUid" to "user-1",
            "name" to name,
            "packageName" to packageName,
            "category" to "other",
            "icon" to "",
            "status" to status,
            "permissions" to emptyList<Map<String, Any?>>(),
            "createdAt" to createdAt,
            "updatedAt" to updatedAt,
            "lastScannedAt" to "OLD_SCANNED",
        )
    }
}

private class MemoryAppScanStore : AppScanStore {
    val docs = mutableMapOf<String, MutableMap<String, Any?>>()
    val writes = mutableListOf<UidWrite>()
    val commits = mutableListOf<List<AppScanWrite>>()
    var listCalls = 0
    var failWrite = false
    var failWriteOnCommit = -1

    fun seed(uid: String, packageName: String, data: Map<String, Any?>) {
        docs[key(uid, packageName)] = data.toMutableMap()
    }

    fun doc(uid: String, packageName: String): Map<String, Any?>? = docs[key(uid, packageName)]

    override suspend fun listApps(uid: String): List<ExistingAppDocument> {
        listCalls += 1
        val prefix = "$uid/"
        return docs
            .filterKeys { it.startsWith(prefix) }
            .map { (key, data) -> ExistingAppDocument(id = key.removePrefix(prefix), data = data.toMap()) }
    }

    override suspend fun commitWrites(uid: String, writes: List<AppScanWrite>) {
        if (failWrite || failWriteOnCommit == commits.size + 1) {
            throw IllegalStateException("firestore write exploded with stack")
        }
        commits += writes
        for (write in writes) {
            this.writes += UidWrite(uid, write.packageName, write.data)
            docs[key(uid, write.packageName)] = write.data.toMutableMap()
        }
    }

    private fun key(uid: String, packageName: String): String = "$uid/$packageName"
}

private data class UidWrite(
    val uid: String,
    val packageName: String,
    val data: Map<String, Any?>,
)

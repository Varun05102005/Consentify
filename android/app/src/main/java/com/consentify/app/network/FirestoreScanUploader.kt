package com.consentify.app.network

import com.consentify.app.scanner.ScannedApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

internal const val USERS_COLLECTION = "users"
internal const val APPS_COLLECTION = "apps"
internal const val FIRESTORE_WRITE_CHUNK = 400

data class ExistingAppDocument(
    val id: String,
    val data: Map<String, Any?>,
)

data class AppScanWrite(
    val packageName: String,
    val data: Map<String, Any?>,
)

interface AppScanStore {
    suspend fun listApps(uid: String): List<ExistingAppDocument>
    suspend fun commitWrites(uid: String, writes: List<AppScanWrite>)
}

private val PACKAGE_NAME_PATTERN =
    Regex("^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+$")

/**
 * Spark-plan ingest: authenticated Firestore writes to
 * `users/{auth.uid}/apps/{packageName}`. UID is never taken from the caller.
 */
class FirestoreScanUploader(
    private val currentUid: () -> String?,
    private val store: AppScanStore,
    private val serverTimestamp: () -> Any,
    private val writeChunkSize: Int = FIRESTORE_WRITE_CHUNK,
) : ScanUploader {

    override suspend fun ingest(apps: List<ScannedApp>): IngestResult {
        val uid = currentUid()?.trim().orEmpty()
        if (uid.isEmpty()) {
            throw IngestException("unauthenticated", IngestMessages.UNAUTHENTICATED)
        }
        if (apps.isEmpty()) {
            return IngestResult(
                writtenAppCount = 0,
                uploadedCount = 0,
                markedRemovedCount = 0,
                restoredCount = 0,
            )
        }

        val incoming = LinkedHashMap<String, ScannedApp>()
        for (app in apps) {
            incoming[assertAndroidPackageName(app.packageName)] = app
        }

        val existing = try {
            store.listApps(uid)
        } catch (error: IngestException) {
            throw error
        } catch (error: Throwable) {
            throw IngestException(normalizeIngestCode(error), ingestErrorMessage(error))
        }

        val existingById = existing.associateBy { it.id }
        val stamp = serverTimestamp()
        val writes = ArrayList<AppScanWrite>(incoming.size)
        var restoredCount = 0

        for ((packageName, app) in incoming) {
            val previous = existingById[packageName]
            if (asString(previous?.data?.get("status")) == "removed") {
                restoredCount += 1
            }
            writes += AppScanWrite(
                packageName = packageName,
                data = installedDocument(uid, app, previous?.data, stamp),
            )
        }

        val incomingNames = incoming.keys
        var markedRemovedCount = 0
        for (document in existing) {
            val identity = androidPackageIdentity(document.id, document.data) ?: continue
            if (incomingNames.contains(identity)) {
                continue
            }
            if (asString(document.data["status"]) != "installed") {
                continue
            }
            writes += AppScanWrite(
                packageName = document.id,
                data = removedDocument(uid, document.id, document.data, stamp),
            )
            markedRemovedCount += 1
        }

        try {
            val chunk = writeChunkSize.coerceAtLeast(1)
            var offset = 0
            while (offset < writes.size) {
                val end = (offset + chunk).coerceAtMost(writes.size)
                store.commitWrites(uid, writes.subList(offset, end).toList())
                offset = end
            }
        } catch (error: IngestException) {
            throw error
        } catch (error: Throwable) {
            throw IngestException(normalizeIngestCode(error), ingestErrorMessage(error))
        }

        return IngestResult(
            writtenAppCount = incoming.size,
            uploadedCount = incoming.size,
            markedRemovedCount = markedRemovedCount,
            restoredCount = restoredCount,
        )
    }

    companion object {
        fun create(
            auth: FirebaseAuth = FirebaseAuth.getInstance(),
            db: FirebaseFirestore = FirebaseFirestore.getInstance(),
        ): FirestoreScanUploader {
            return FirestoreScanUploader(
                currentUid = { auth.currentUser?.uid },
                store = FirebaseAppScanStore(db),
                serverTimestamp = { FieldValue.serverTimestamp() },
            )
        }
    }
}

class FirebaseAppScanStore(
    private val db: FirebaseFirestore,
) : AppScanStore {
    override suspend fun listApps(uid: String): List<ExistingAppDocument> {
        val snapshot = db.collection(USERS_COLLECTION).document(uid).collection(APPS_COLLECTION).get().await()
        return snapshot.documents.map { document ->
            ExistingAppDocument(id = document.id, data = document.data.orEmpty())
        }
    }

    override suspend fun commitWrites(uid: String, writes: List<AppScanWrite>) {
        if (writes.isEmpty()) {
            return
        }
        val apps = db.collection(USERS_COLLECTION).document(uid).collection(APPS_COLLECTION)
        val batch = db.batch()
        for (write in writes) {
            @Suppress("UNCHECKED_CAST")
            batch.set(apps.document(write.packageName), write.data as Map<String, Any>)
        }
        batch.commit().await()
    }
}

internal fun assertAndroidPackageName(packageName: String): String {
    val trimmed = packageName.trim()
    if (
        trimmed != packageName ||
        trimmed.length !in 3..255 ||
        trimmed.contains('/') ||
        trimmed.contains('\\') ||
        trimmed.contains("..") ||
        trimmed.startsWith('.') ||
        trimmed.endsWith('.') ||
        !PACKAGE_NAME_PATTERN.matches(trimmed)
    ) {
        throw IngestException("invalid-argument", IngestMessages.INVALID)
    }
    return trimmed
}

internal fun androidPackageIdentity(docId: String, data: Map<String, Any?>): String? {
    val named = asString(data["packageName"])
    if (named != null && PACKAGE_NAME_PATTERN.matches(named)) {
        return named
    }
    if (PACKAGE_NAME_PATTERN.matches(docId)) {
        return docId
    }
    return null
}

internal fun installedDocument(
    uid: String,
    app: ScannedApp,
    existing: Map<String, Any?>?,
    timestamp: Any,
): Map<String, Any?> {
    return hashMapOf(
        "ownerUid" to uid,
        "name" to app.appName,
        "packageName" to app.packageName,
        "category" to (asString(existing?.get("category")) ?: "other"),
        "icon" to ((existing?.get("icon") as? String) ?: ""),
        "status" to "installed",
        "permissions" to permissionDocuments(app),
        "lastScannedAt" to timestamp,
        "updatedAt" to timestamp,
        "createdAt" to (existing?.get("createdAt") ?: timestamp),
    )
}

internal fun removedDocument(
    uid: String,
    docId: String,
    existing: Map<String, Any?>,
    timestamp: Any,
): Map<String, Any?> {
    val packageName = asString(existing["packageName"]) ?: docId
    return hashMapOf(
        "ownerUid" to uid,
        "name" to (asString(existing["name"]) ?: packageName),
        "packageName" to packageName,
        "category" to (asString(existing["category"]) ?: "other"),
        "icon" to ((existing["icon"] as? String) ?: ""),
        "status" to "removed",
        "permissions" to ((existing["permissions"] as? List<*>) ?: emptyList<Any>()),
        "lastScannedAt" to (existing["lastScannedAt"] ?: null),
        "updatedAt" to timestamp,
        "createdAt" to (existing["createdAt"] ?: timestamp),
    )
}

internal fun permissionDocuments(app: ScannedApp): List<Map<String, Any?>> {
    return app.permissions.map { permission ->
        mutableMapOf<String, Any?>(
            "type" to permission.consentifyType.wireValue,
            "label" to permission.label,
            "status" to permission.status.wireValue,
            "backgroundAccess" to permission.backgroundAccess,
            "lastUsedAt" to null,
        )
    }
}

internal fun asString(value: Any?): String? {
    return (value as? String)?.trim()?.takeIf { it.isNotEmpty() }
}

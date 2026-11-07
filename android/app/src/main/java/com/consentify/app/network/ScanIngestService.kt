package com.consentify.app.network

import com.consentify.app.scanner.ScannedApp

/**
 * Spark-plan Android ingestion writes directly to Firestore.
 * The Cloud Functions callable `ingestAppScan` remains in `functions/`
 * for an optional future Blaze deployment and is not used by the scanner.
 */

data class IngestResult(
    val writtenAppCount: Int,
    val uploadedCount: Int = writtenAppCount,
    val markedRemovedCount: Int = 0,
    val restoredCount: Int = 0,
)

class IngestException(
    val code: String,
    override val message: String,
) : Exception(message)

fun serializeScanPayload(apps: List<ScannedApp>): Map<String, Any> {
    return mapOf(
        "apps" to apps.map { app ->
            mapOf(
                "packageName" to app.packageName,
                "appName" to app.appName,
                "permissions" to app.permissions.map { permission ->
                    mapOf(
                        "consentifyType" to permission.consentifyType.wireValue,
                        "label" to permission.label,
                        "status" to permission.status.wireValue,
                        "backgroundAccess" to permission.backgroundAccess,
                    )
                },
            )
        },
    )
}

fun interface ScanCallable {
    suspend fun invoke(payload: Map<String, Any>): Map<String, Any?>
}

fun interface ScanUploader {
    suspend fun ingest(apps: List<ScannedApp>): IngestResult
}

class ScanIngestService(
    private val currentUid: () -> String?,
    private val caller: ScanCallable,
) {
    suspend fun ingest(apps: List<ScannedApp>): IngestResult {
        if (currentUid().isNullOrBlank()) {
            throw IngestException("unauthenticated", IngestMessages.UNAUTHENTICATED)
        }

        val payload = serializeScanPayload(apps)
        val response = try {
            caller.invoke(payload)
        } catch (error: IngestException) {
            throw error
        } catch (error: Throwable) {
            throw IngestException(normalizeIngestCode(error), ingestErrorMessage(error))
        }

        val uploadedCount = readCount(response, "uploadedCount")
            ?: readCount(response, "writtenAppCount")
            ?: apps.size
        val writtenAppCount = readCount(response, "writtenAppCount") ?: uploadedCount
        return IngestResult(
            writtenAppCount = writtenAppCount,
            uploadedCount = uploadedCount,
            markedRemovedCount = readCount(response, "markedRemovedCount") ?: 0,
            restoredCount = readCount(response, "restoredCount") ?: 0,
        )
    }
}

object IngestMessages {
    const val UNAUTHENTICATED = "Sign in to upload a scan."
    const val INVALID = "The scan could not be saved. Check the app list and try again."
    const val DENIED = "You do not have permission to save this scan."
    const val EXHAUSTED = "Too many apps in this scan. Try again with fewer apps."
    const val UNAVAILABLE = "Scan upload is unavailable right now. Try again."
    const val GENERIC = "Unable to save this scan. Please try again."
}

internal fun normalizeIngestCode(error: Throwable): String {
    if (error is IngestException) {
        return error.code
    }
    val raw = error.message.orEmpty().lowercase()
    return when {
        raw.contains("unauthenticated") -> "unauthenticated"
        raw.contains("invalid-argument") || raw.contains("invalid_argument") -> "invalid-argument"
        raw.contains("resource-exhausted") || raw.contains("resource_exhausted") -> "resource-exhausted"
        raw.contains("permission-denied") || raw.contains("permission_denied") -> "permission-denied"
        raw.contains("unavailable") -> "unavailable"
        else -> "internal"
    }
}

internal fun ingestErrorMessage(error: Throwable): String {
    return when (normalizeIngestCode(error)) {
        "unauthenticated" -> IngestMessages.UNAUTHENTICATED
        "invalid-argument" -> IngestMessages.INVALID
        "permission-denied" -> IngestMessages.DENIED
        "resource-exhausted" -> IngestMessages.EXHAUSTED
        "unavailable" -> IngestMessages.UNAVAILABLE
        else -> IngestMessages.GENERIC
    }
}

internal fun readCount(response: Map<String, Any?>, key: String): Int? {
    return when (val value = response[key]) {
        is Number -> value.toInt()
        else -> null
    }
}

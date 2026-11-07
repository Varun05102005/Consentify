package com.consentify.app.scanner

object ScannerMessages {
    const val SCAN_FAILED = "Couldn't scan applications."
    const val SESSION_EXPIRED = "Your session has expired. Sign in again."
    const val UPLOAD_FAILED = "Scan completed, but the results could not be uploaded."
    const val VALIDATION_FAILED = "Consentify couldn't accept this scan."
}

data class ScanSummary(
    val appsScanned: Int,
    val appsWithPermissions: Int,
    val permissionFacts: Int,
    val appsUploaded: Int,
    val appsMarkedRemoved: Int = 0,
    val appsRestored: Int = 0,
)

fun ScanResult.toSummary(
    appsUploaded: Int = 0,
    appsMarkedRemoved: Int = 0,
    appsRestored: Int = 0,
): ScanSummary {
    return ScanSummary(
        appsScanned = apps.size,
        appsWithPermissions = apps.count { it.permissions.isNotEmpty() },
        permissionFacts = apps.sumOf { it.permissions.size },
        appsUploaded = appsUploaded,
        appsMarkedRemoved = appsMarkedRemoved,
        appsRestored = appsRestored,
    )
}

sealed interface ScannerUiState {
    data object SignedOut : ScannerUiState
    data object Ready : ScannerUiState
    data object Scanning : ScannerUiState
    data object Uploading : ScannerUiState
    data class Empty(val summary: ScanSummary) : ScannerUiState
    data class Success(val summary: ScanSummary) : ScannerUiState
    data class ScanCompletedUploadFailed(
        val summary: ScanSummary,
        val message: String,
        val sessionExpired: Boolean = false,
    ) : ScannerUiState
    data class Error(val message: String) : ScannerUiState
}

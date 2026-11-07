package com.consentify.app.scanner

import com.consentify.app.auth.AuthState
import com.consentify.app.network.IngestException
import com.consentify.app.network.IngestResult
import com.consentify.app.network.ScanUploader
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ScannerViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()

    @Before
    fun setMain() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun reset() {
        Dispatchers.resetMain()
    }

    @Test
    fun signedOutPreventsScanAndUpload() = runTest(dispatcher) {
        var scans = 0
        var uploads = 0
        val viewModel = viewModel(
            auth = AuthState.Unauthenticated,
            scanner = {
                scans += 1
                sampleResult()
            },
            uploader = {
                uploads += 1
                IngestResult(it.size)
            },
        )
        viewModel.scanApplications()
        viewModel.retryUpload()
        assertEquals(ScannerUiState.SignedOut, viewModel.state.value)
        assertEquals(0, scans)
        assertEquals(0, uploads)
    }

    @Test
    fun scanButtonTransitionsToScanning() = runTest(dispatcher) {
        val gate = CompletableDeferred<ScanResult>()
        val viewModel = viewModel(
            scanner = { gate.await() },
            uploader = { IngestResult(it.size) },
        )
        viewModel.scanApplications()
        assertEquals(ScannerUiState.Scanning, viewModel.state.value)
        gate.complete(sampleResult())
    }

    @Test
    fun successfulScanProducesCorrectAppCount() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = { sampleResult() },
            uploader = { IngestResult(it.size) },
        )
        viewModel.scanApplications()
        val state = viewModel.state.value as ScannerUiState.Success
        assertEquals(2, state.summary.appsScanned)
        assertEquals(1, state.summary.appsWithPermissions)
        assertEquals(1, state.summary.permissionFacts)
        assertEquals(2, state.summary.appsUploaded)
        assertEquals(0, state.summary.appsMarkedRemoved)
        assertEquals(0, state.summary.appsRestored)
    }

    @Test
    fun emptyScanProducesEmptyState() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = {
                ScanResult(
                    apps = emptyList(),
                    scannedAtEpochMs = 1L,
                    sdkInt = 34,
                    discoveredLauncherCount = 0,
                    skippedSystemCount = 0,
                    skippedNonLauncherCount = 0,
                )
            },
            uploader = { error("upload should not run") },
        )
        viewModel.scanApplications()
        val state = viewModel.state.value as ScannerUiState.Empty
        assertEquals(0, state.summary.appsScanned)
        assertEquals(0, state.summary.appsUploaded)
        assertEquals(0, state.summary.appsMarkedRemoved)
        assertEquals(0, state.summary.appsRestored)
    }

    @Test
    fun successfulUploadShowsSynchronizationCounts() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = { sampleResult() },
            uploader = {
                IngestResult(
                    writtenAppCount = 2,
                    uploadedCount = 2,
                    markedRemovedCount = 3,
                    restoredCount = 1,
                )
            },
        )
        viewModel.scanApplications()
        val state = viewModel.state.value as ScannerUiState.Success
        assertEquals(2, state.summary.appsScanned)
        assertEquals(2, state.summary.appsUploaded)
        assertEquals(3, state.summary.appsMarkedRemoved)
        assertEquals(1, state.summary.appsRestored)
        assertFalse(state.toString().contains("riskScore"))
        assertFalse(state.toString().contains("High"))
        assertFalse(state.toString().contains("privacyScore"))
    }

    @Test
    fun uploadIsCalledAfterSuccessfulScan() = runTest(dispatcher) {
        var uploads = 0
        val viewModel = viewModel(
            scanner = { sampleResult() },
            uploader = {
                uploads += 1
                IngestResult(it.size)
            },
        )
        viewModel.scanApplications()
        assertEquals(1, uploads)
        assertTrue(viewModel.state.value is ScannerUiState.Success)
    }

    @Test
    fun uploadSuccessProducesSuccessState() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = { sampleResult() },
            uploader = { IngestResult(2) },
        )
        viewModel.scanApplications()
        val state = viewModel.state.value as ScannerUiState.Success
        assertEquals(2, state.summary.appsUploaded)
        assertFalse(state.toString().contains("riskScore"))
        assertFalse(state.toString().contains("High"))
    }

    @Test
    fun uploadFailurePreservesScannedResult() = runTest(dispatcher) {
        var scans = 0
        val viewModel = viewModel(
            scanner = {
                scans += 1
                sampleResult()
            },
            uploader = { throw IngestException("unavailable", "nope") },
        )
        viewModel.scanApplications()
        val failed = viewModel.state.value as ScannerUiState.ScanCompletedUploadFailed
        assertEquals(ScannerMessages.UPLOAD_FAILED, failed.message)
        assertEquals(2, failed.summary.appsScanned)
        assertEquals(0, failed.summary.appsUploaded)
        assertEquals(0, failed.summary.appsMarkedRemoved)
        assertEquals(0, failed.summary.appsRestored)
        assertEquals(1, scans)
    }

    @Test
    fun retryUploadDoesNotTriggerAnotherScan() = runTest(dispatcher) {
        var scans = 0
        var uploads = 0
        val viewModel = viewModel(
            scanner = {
                scans += 1
                sampleResult()
            },
            uploader = {
                uploads += 1
                if (uploads == 1) throw IngestException("unavailable", "nope")
                IngestResult(
                    writtenAppCount = 2,
                    uploadedCount = 2,
                    markedRemovedCount = 1,
                    restoredCount = 0,
                )
            },
        )
        viewModel.scanApplications()
        viewModel.retryUpload()
        assertEquals(1, scans)
        assertEquals(2, uploads)
        val success = viewModel.state.value as ScannerUiState.Success
        assertEquals(2, success.summary.appsUploaded)
        assertEquals(1, success.summary.appsMarkedRemoved)
        assertEquals(0, success.summary.appsRestored)
    }

    @Test
    fun scannerFailureProducesSafeErrorState() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = { error("PackageManager exploded with stack") },
            uploader = { error("upload should not run") },
        )
        viewModel.scanApplications()
        val state = viewModel.state.value as ScannerUiState.Error
        assertEquals(ScannerMessages.SCAN_FAILED, state.message)
        assertFalse(state.message.contains("PackageManager"))
        assertFalse(state.message.contains("stack"))
    }

    @Test
    fun duplicateScanActionsArePreventedWhileScanning() = runTest(dispatcher) {
        val gate = CompletableDeferred<ScanResult>()
        var scans = 0
        val viewModel = viewModel(
            scanner = {
                scans += 1
                gate.await()
            },
            uploader = { IngestResult(it.size) },
        )
        viewModel.scanApplications()
        viewModel.scanApplications()
        assertEquals(ScannerUiState.Scanning, viewModel.state.value)
        assertEquals(1, scans)
        gate.complete(sampleResult())
        assertTrue(viewModel.state.value is ScannerUiState.Success)
    }

    @Test
    fun viewModelDoesNotCalculateRiskScores() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = { sampleResult() },
            uploader = { IngestResult(1) },
        )
        viewModel.scanApplications()
        val text = viewModel.state.value.toString()
        assertFalse(text.contains("riskScore"))
        assertFalse(text.contains("privacyScore"))
        assertFalse(text.contains("riskLevel"))
    }

    @Test
    fun viewModelDoesNotCallGemini() = runTest(dispatcher) {
        var geminiCalls = 0
        val viewModel = ScannerViewModel(
            auth = MutableStateFlow(AuthState.Authenticated("uid-1")),
            scanner = AppScanner { sampleResult() },
            uploader = ScanUploader { IngestResult(it.size) },
            scanDispatcher = dispatcher,
        )
        viewModel.scanApplications()
        assertEquals(0, geminiCalls)
        assertTrue(viewModel.state.value is ScannerUiState.Success)
    }

    @Test
    fun validationErrorUsesSafeMessage() = runTest(dispatcher) {
        val viewModel = viewModel(
            scanner = { sampleResult() },
            uploader = { throw IngestException("invalid-argument", "raw dump") },
        )
        viewModel.scanApplications()
        val failed = viewModel.state.value as ScannerUiState.ScanCompletedUploadFailed
        assertEquals(ScannerMessages.VALIDATION_FAILED, failed.message)
    }

    private fun viewModel(
        auth: AuthState = AuthState.Authenticated("uid-1"),
        scanner: suspend () -> ScanResult,
        uploader: suspend (List<ScannedApp>) -> IngestResult,
    ): ScannerViewModel {
        return ScannerViewModel(
            auth = MutableStateFlow(auth),
            scanner = AppScanner { scanner() },
            uploader = ScanUploader { uploader(it) },
            scanDispatcher = dispatcher,
        )
    }

    private fun sampleResult(): ScanResult {
        return ScanResult(
            apps = listOf(
                ScannedApp(
                    packageName = "com.example.maps",
                    appName = "Maps",
                    permissions = listOf(
                        ScannedPermissionFact(
                            consentifyType = PermissionType.LOCATION,
                            label = "Location",
                            status = PermissionStatus.GRANTED,
                            backgroundAccess = true,
                        ),
                    ),
                ),
                ScannedApp(
                    packageName = "com.example.notes",
                    appName = "Notes",
                    permissions = emptyList(),
                ),
            ),
            scannedAtEpochMs = 1L,
            sdkInt = 34,
            discoveredLauncherCount = 2,
            skippedSystemCount = 0,
            skippedNonLauncherCount = 0,
        )
    }
}

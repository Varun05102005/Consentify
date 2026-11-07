package com.consentify.app.scanner

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.consentify.app.auth.AuthState
import com.consentify.app.network.FirestoreScanUploader
import com.consentify.app.network.IngestException
import com.consentify.app.network.ScanUploader
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ScannerViewModel(
    private val auth: StateFlow<AuthState>,
    private val scanner: AppScanner,
    private val uploader: ScanUploader,
    private val scanDispatcher: CoroutineDispatcher = Dispatchers.Default,
) : ViewModel() {
    private val _state = MutableStateFlow<ScannerUiState>(initialState(auth.value))
    val state: StateFlow<ScannerUiState> = _state.asStateFlow()

    private var lastScan: ScanResult? = null
    private var inFlight: Job? = null

    init {
        viewModelScope.launch {
            auth.collect { authState ->
                if (authState is AuthState.Authenticated) {
                    if (_state.value is ScannerUiState.SignedOut) {
                        _state.value = ScannerUiState.Ready
                    }
                } else {
                    lastScan = null
                    inFlight?.cancel()
                    inFlight = null
                    _state.value = ScannerUiState.SignedOut
                }
            }
        }
    }

    fun scanApplications() {
        if (!isAuthenticated()) {
            _state.value = ScannerUiState.SignedOut
            return
        }
        if (isBusy()) {
            return
        }
        inFlight = viewModelScope.launch {
            _state.value = ScannerUiState.Scanning
            val result = try {
                withContext(scanDispatcher) { scanner.scan() }
            } catch (_: Throwable) {
                lastScan = null
                _state.value = ScannerUiState.Error(ScannerMessages.SCAN_FAILED)
                return@launch
            }
            lastScan = result
            if (result.apps.isEmpty()) {
                _state.value = ScannerUiState.Empty(result.toSummary(appsUploaded = 0))
                return@launch
            }
            upload(result)
        }
    }

    fun retryUpload() {
        if (!isAuthenticated()) {
            _state.value = ScannerUiState.SignedOut
            return
        }
        if (isBusy()) {
            return
        }
        val result = lastScan ?: return
        inFlight = viewModelScope.launch { upload(result) }
    }

    fun scanAgain() {
        lastScan = null
        if (!isAuthenticated()) {
            _state.value = ScannerUiState.SignedOut
            return
        }
        _state.value = ScannerUiState.Ready
    }

    private suspend fun upload(result: ScanResult) {
        _state.value = ScannerUiState.Uploading
        try {
            val uploaded = uploader.ingest(result.apps)
            _state.value = ScannerUiState.Success(
                result.toSummary(
                    appsUploaded = uploaded.uploadedCount,
                    appsMarkedRemoved = uploaded.markedRemovedCount,
                    appsRestored = uploaded.restoredCount,
                ),
            )
        } catch (error: Throwable) {
            _state.value = uploadFailure(result, error)
        }
    }

    private fun uploadFailure(result: ScanResult, error: Throwable): ScannerUiState {
        val code = (error as? IngestException)?.code.orEmpty()
        val sessionExpired = code == "unauthenticated"
        val message = when {
            sessionExpired -> ScannerMessages.SESSION_EXPIRED
            code == "invalid-argument" -> ScannerMessages.VALIDATION_FAILED
            else -> ScannerMessages.UPLOAD_FAILED
        }
        return ScannerUiState.ScanCompletedUploadFailed(
            summary = result.toSummary(appsUploaded = 0),
            message = message,
            sessionExpired = sessionExpired,
        )
    }

    private fun isAuthenticated(): Boolean = auth.value is AuthState.Authenticated

    private fun isBusy(): Boolean {
        val current = _state.value
        return current is ScannerUiState.Scanning || current is ScannerUiState.Uploading
    }

    companion object {
        fun factory(
            context: Context,
            auth: StateFlow<AuthState>,
        ): ViewModelProvider.Factory {
            val appContext = context.applicationContext
            val deviceScanner = AndroidPermissionScanner(appContext)
            return object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return ScannerViewModel(
                        auth = auth,
                        scanner = AppScanner { deviceScanner.scan() },
                        uploader = FirestoreScanUploader.create(),
                    ) as T
                }
            }
        }
    }
}

private fun initialState(auth: AuthState): ScannerUiState {
    return if (auth is AuthState.Authenticated) {
        ScannerUiState.Ready
    } else {
        ScannerUiState.SignedOut
    }
}

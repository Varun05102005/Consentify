package com.consentify.app.ui.scanner

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.consentify.app.R
import com.consentify.app.scanner.ScanSummary
import com.consentify.app.scanner.ScannerUiState
import com.consentify.app.scanner.ScannerViewModel
import com.consentify.app.ui.components.BrandHeader
import com.consentify.app.ui.theme.RiskSafe
import androidx.compose.ui.semantics.ProgressBarRangeInfo

@Composable
fun ScannerScreen(
    viewModel: ScannerViewModel,
    onSignOut: () -> Unit,
    onSignIn: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    ScannerContent(
        state = state,
        onScan = viewModel::scanApplications,
        onRetryUpload = viewModel::retryUpload,
        onSignOut = onSignOut,
        onSignIn = onSignIn,
    )
}

@Composable
fun ScannerContent(
    state: ScannerUiState,
    onScan: () -> Unit,
    onRetryUpload: () -> Unit,
    onSignOut: () -> Unit,
    onSignIn: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        BrandHeader()
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.shell_subtitle),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(24.dp))
        when (state) {
            ScannerUiState.SignedOut -> SignedOutPane(onSignIn = onSignIn)
            ScannerUiState.Ready -> ReadyPane(onScan = onScan)
            ScannerUiState.Scanning -> ProgressPane(
                title = stringResource(R.string.scanning_apps),
                description = stringResource(R.string.scanning_apps_cd),
            )
            ScannerUiState.Uploading -> ProgressPane(
                title = stringResource(R.string.uploading_scan),
                description = stringResource(R.string.uploading_scan_cd),
            )
            is ScannerUiState.Empty -> EmptyPane(onScanAgain = onScan)
            is ScannerUiState.Success -> SuccessPane(summary = state.summary, onScanAgain = onScan)
            is ScannerUiState.ScanCompletedUploadFailed -> UploadFailedPane(
                state = state,
                onRetryUpload = onRetryUpload,
                onScanAgain = onScan,
                onSignIn = onSignIn,
            )
            is ScannerUiState.Error -> ErrorPane(message = state.message, onScanAgain = onScan)
        }
        Spacer(modifier = Modifier.height(16.dp))
        TextButton(
            onClick = onSignOut,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp),
        ) {
            Text(stringResource(R.string.sign_out))
        }
    }
}

@Composable
private fun ReadyPane(onScan: () -> Unit) {
    Text(
        text = stringResource(R.string.scanner_explanation),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = onScan,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
    ) {
        Text(stringResource(R.string.scan_applications))
    }
}

@Composable
private fun SignedOutPane(onSignIn: () -> Unit) {
    Text(
        text = stringResource(R.string.sign_in_to_sync),
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = onSignIn,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
    ) {
        Text(stringResource(R.string.sign_in))
    }
}

@Composable
private fun ProgressPane(title: String, description: String) {
    Text(
        text = title,
        modifier = Modifier.semantics {
            heading()
            liveRegion = LiveRegionMode.Polite
            stateDescription = title
        },
        style = MaterialTheme.typography.titleLarge,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(24.dp))
    CircularProgressIndicator(
        modifier = Modifier.semantics {
            contentDescription = description
            progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate
        },
    )
}

@Composable
private fun EmptyPane(onScanAgain: () -> Unit) {
    Text(
        text = stringResource(R.string.no_apps_found),
        modifier = Modifier.semantics { heading() },
        style = MaterialTheme.typography.titleLarge,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(12.dp))
    Text(
        text = stringResource(R.string.no_apps_found_body),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = onScanAgain,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
    ) {
        Text(stringResource(R.string.scan_again))
    }
}

@Composable
private fun SuccessPane(summary: ScanSummary, onScanAgain: () -> Unit) {
    Text(
        text = stringResource(R.string.scan_complete),
        modifier = Modifier.semantics { heading() },
        style = MaterialTheme.typography.titleLarge,
        color = RiskSafe,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(16.dp))
    SummaryCard(summary)
    Spacer(modifier = Modifier.height(16.dp))
    Text(
        text = stringResource(R.string.scan_complete_body),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = onScanAgain,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
    ) {
        Text(stringResource(R.string.scan_again))
    }
}

@Composable
private fun UploadFailedPane(
    state: ScannerUiState.ScanCompletedUploadFailed,
    onRetryUpload: () -> Unit,
    onScanAgain: () -> Unit,
    onSignIn: () -> Unit,
) {
    Text(
        text = state.message,
        modifier = Modifier.semantics {
            heading()
            liveRegion = LiveRegionMode.Polite
        },
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.tertiary,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(16.dp))
    SummaryCard(state.summary)
    Spacer(modifier = Modifier.height(24.dp))
    if (state.sessionExpired) {
        Button(
            onClick = onSignIn,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp),
        ) {
            Text(stringResource(R.string.sign_in))
        }
    } else {
        Button(
            onClick = onRetryUpload,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp),
        ) {
            Text(stringResource(R.string.retry_upload))
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(
            onClick = onScanAgain,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp),
        ) {
            Text(stringResource(R.string.scan_again))
        }
    }
}

@Composable
private fun ErrorPane(message: String, onScanAgain: () -> Unit) {
    Text(
        text = message,
        modifier = Modifier.semantics {
            heading()
            liveRegion = LiveRegionMode.Polite
        },
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.error,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
        onClick = onScanAgain,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
    ) {
        Text(stringResource(R.string.scan_again))
    }
}

@Composable
private fun SummaryCard(summary: ScanSummary) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 0.dp,
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            SummaryRow(
                label = stringResource(R.string.apps_scanned),
                value = summary.appsScanned.toString(),
            )
            Spacer(modifier = Modifier.height(8.dp))
            SummaryRow(
                label = stringResource(R.string.apps_with_permissions),
                value = summary.appsWithPermissions.toString(),
            )
            Spacer(modifier = Modifier.height(8.dp))
            SummaryRow(
                label = stringResource(R.string.permission_facts),
                value = summary.permissionFacts.toString(),
            )
            Spacer(modifier = Modifier.height(8.dp))
            SummaryRow(
                label = stringResource(R.string.apps_uploaded),
                value = summary.appsUploaded.toString(),
            )
            Spacer(modifier = Modifier.height(8.dp))
            SummaryRow(
                label = stringResource(R.string.apps_marked_removed),
                value = summary.appsMarkedRemoved.toString(),
            )
            Spacer(modifier = Modifier.height(8.dp))
            SummaryRow(
                label = stringResource(R.string.apps_restored),
                value = summary.appsRestored.toString(),
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

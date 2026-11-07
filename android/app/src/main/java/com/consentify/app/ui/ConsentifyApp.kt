package com.consentify.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.consentify.app.auth.AuthState
import com.consentify.app.auth.AuthViewModel
import com.consentify.app.scanner.ScannerViewModel
import com.consentify.app.ui.scanner.ScannerScreen

@Composable
fun ConsentifyApp(authViewModel: AuthViewModel = viewModel()) {
    val authState by authViewModel.state.collectAsStateWithLifecycle()
    var sessionChecked by remember { mutableStateOf(false) }
    LaunchedEffect(authState) {
        if (authState !is AuthState.Authenticating) {
            sessionChecked = true
        }
    }

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding(),
        color = MaterialTheme.colorScheme.background,
    ) {
        when {
            !sessionChecked && authState is AuthState.Authenticating -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            authState is AuthState.Authenticated -> {
                val context = LocalContext.current
                val scannerViewModel: ScannerViewModel = viewModel(
                    factory = ScannerViewModel.factory(context, authViewModel.state),
                )
                ScannerScreen(
                    viewModel = scannerViewModel,
                    onSignOut = authViewModel::signOut,
                    onSignIn = authViewModel::signOut,
                )
            }
            else -> AuthScreen(
                state = authState,
                onSignIn = authViewModel::signIn,
                onCreateAccount = authViewModel::createAccount,
            )
        }
    }
}

package com.consentify.app.auth

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthRepository(
    private val client: AuthClient,
    observerScope: CoroutineScope,
) {
    private val _state = MutableStateFlow<AuthState>(AuthState.Authenticating)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    @Volatile
    private var inFlight = false

    init {
        observerScope.launch {
            client.observeUid().collect { uid ->
                if (inFlight) {
                    return@collect
                }
                if (uid != null) {
                    _state.value = AuthState.Authenticated(uid)
                    return@collect
                }
                if (_state.value is AuthState.Error) {
                    return@collect
                }
                _state.value = AuthState.Unauthenticated
            }
        }
    }

    suspend fun signIn(email: String, password: String) {
        submitValidated(email, password) { client.signIn(email.trim(), password) }
    }

    suspend fun createAccount(email: String, password: String) {
        submitValidated(email, password) { client.createAccount(email.trim(), password) }
    }

    suspend fun signOut() {
        inFlight = true
        try {
            client.signOut()
            _state.value = AuthState.Unauthenticated
        } catch (error: Throwable) {
            _state.value = AuthState.Error(authErrorMessage(error))
        } finally {
            inFlight = false
        }
    }

    private suspend fun submitValidated(
        email: String,
        password: String,
        action: suspend () -> String,
    ) {
        val message = AuthValidation.validate(email, password)
        if (message != null) {
            _state.value = AuthState.Error(message)
            return
        }
        inFlight = true
        _state.value = AuthState.Authenticating
        try {
            val uid = action()
            _state.value = AuthState.Authenticated(uid)
        } catch (error: Throwable) {
            _state.value = AuthState.Error(authErrorMessage(error))
        } finally {
            inFlight = false
        }
    }
}

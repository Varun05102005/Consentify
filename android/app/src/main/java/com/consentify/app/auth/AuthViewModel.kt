package com.consentify.app.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel @JvmOverloads constructor(
    client: AuthClient = FirebaseAuthClient(),
) : ViewModel() {
    private val repository = AuthRepository(client, viewModelScope)
    val state: StateFlow<AuthState> = repository.state

    fun signIn(email: String, password: String) {
        viewModelScope.launch { repository.signIn(email, password) }
    }

    fun createAccount(email: String, password: String) {
        viewModelScope.launch { repository.createAccount(email, password) }
    }

    fun signOut() {
        viewModelScope.launch { repository.signOut() }
    }
}

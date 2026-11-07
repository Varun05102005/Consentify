package com.consentify.app.auth

sealed interface AuthState {
    data object Unauthenticated : AuthState
    data object Authenticating : AuthState
    data class Authenticated(val uid: String) : AuthState
    data class Error(val message: String) : AuthState
}

class AuthClientException(
    val code: String,
    override val message: String,
) : Exception(message)

interface AuthClient {
    fun observeUid(): kotlinx.coroutines.flow.Flow<String?>
    suspend fun signIn(email: String, password: String): String
    suspend fun createAccount(email: String, password: String): String
    suspend fun signOut()
}

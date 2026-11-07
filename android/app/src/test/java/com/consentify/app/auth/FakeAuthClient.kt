package com.consentify.app.auth

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeAuthClient(
    initialUid: String? = null,
) : AuthClient {
    private val uid = MutableStateFlow(initialUid)
    var signInCalls = 0
        private set
    var createAccountCalls = 0
        private set
    var signOutCalls = 0
        private set
    var failWith: Throwable? = null
    var lastEmail: String? = null
        private set

    override fun observeUid(): Flow<String?> = uid.asStateFlow()

    override suspend fun signIn(email: String, password: String): String {
        signInCalls += 1
        lastEmail = email
        failWith?.let { throw it }
        uid.value = "uid-test"
        return "uid-test"
    }

    override suspend fun createAccount(email: String, password: String): String {
        createAccountCalls += 1
        lastEmail = email
        failWith?.let { throw it }
        uid.value = "uid-new"
        return "uid-new"
    }

    override suspend fun signOut() {
        signOutCalls += 1
        failWith?.let { throw it }
        uid.value = null
    }
}

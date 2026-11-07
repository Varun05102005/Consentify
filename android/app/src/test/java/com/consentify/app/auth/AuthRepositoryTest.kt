package com.consentify.app.auth

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthRepositoryTest {
    @Test
    fun initialStateIsUnauthenticatedWhenNoSession() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        val repository = AuthRepository(client, backgroundScope)
        assertEquals(AuthState.Unauthenticated, repository.state.value)
    }

    @Test
    fun restoredSessionExposesUid() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient(initialUid = "uid-restored")
        val repository = AuthRepository(client, backgroundScope)
        assertEquals(AuthState.Authenticated("uid-restored"), repository.state.value)
    }

    @Test
    fun authenticatedStateExposesUid() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        val repository = AuthRepository(client, backgroundScope)
        repository.signIn("user@example.com", "secret1")
        val state = repository.state.value
        assertTrue(state is AuthState.Authenticated)
        assertEquals("uid-test", (state as AuthState.Authenticated).uid)
    }

    @Test
    fun signInSuccessCallsClientOnce() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        val repository = AuthRepository(client, backgroundScope)
        repository.signIn("user@example.com", "secret1")
        assertEquals(1, client.signInCalls)
        assertEquals("user@example.com", client.lastEmail)
    }

    @Test
    fun createAccountSuccessExposesUid() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        val repository = AuthRepository(client, backgroundScope)
        repository.createAccount("new@example.com", "secret1")
        assertEquals(1, client.createAccountCalls)
        assertEquals(AuthState.Authenticated("uid-new"), repository.state.value)
    }

    @Test
    fun signOutReturnsToUnauthenticated() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        val repository = AuthRepository(client, backgroundScope)
        repository.signIn("user@example.com", "secret1")
        repository.signOut()
        assertEquals(1, client.signOutCalls)
        assertEquals(AuthState.Unauthenticated, repository.state.value)
    }

    @Test
    fun invalidCredentialIsNormalized() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        client.failWith = AuthClientException("ERROR_INVALID_CREDENTIAL", "raw dump")
        val repository = AuthRepository(client, backgroundScope)
        repository.signIn("user@example.com", "secret1")
        val state = repository.state.value
        assertTrue(state is AuthState.Error)
        assertEquals(AuthMessages.INVALID_CREDENTIALS, (state as AuthState.Error).message)
    }

    @Test
    fun validationFailureDoesNotCallFirebase() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeAuthClient()
        val repository = AuthRepository(client, backgroundScope)
        repository.signIn("not-an-email", "secret1")
        assertEquals(0, client.signInCalls)
        assertEquals(AuthState.Error(AuthMessages.INVALID_EMAIL), repository.state.value)
    }
}

class AuthValidationTest {
    @Test
    fun rejectsEmptyCredentials() {
        assertEquals(AuthMessages.ENTER_EMAIL_PASSWORD, AuthValidation.validate("", ""))
    }

    @Test
    fun rejectsInvalidEmail() {
        assertEquals(AuthMessages.INVALID_EMAIL, AuthValidation.validate("not-an-email", "secret1"))
    }

    @Test
    fun rejectsShortPassword() {
        assertEquals(AuthMessages.WEAK_PASSWORD, AuthValidation.validate("user@example.com", "123"))
    }

    @Test
    fun mapsFirebaseStyleCodesWithoutRawDump() {
        val error = AuthClientException("auth/wrong-password", "EXCEPTION DUMP WITH TOKEN")
        assertEquals(AuthMessages.INVALID_CREDENTIALS, authErrorMessage(error))
    }

    @Test
    fun mapsNetworkAndCollisionCodes() {
        assertEquals(
            AuthMessages.NETWORK,
            authErrorMessage(AuthClientException("ERROR_NETWORK_REQUEST_FAILED", "ignored")),
        )
        assertEquals(
            AuthMessages.EMAIL_IN_USE,
            authErrorMessage(AuthClientException("ERROR_EMAIL_ALREADY_IN_USE", "ignored")),
        )
        assertEquals(
            AuthMessages.GENERIC,
            authErrorMessage(AuthClientException("something-unknown", "FirebaseAuthException dump")),
        )
    }
}

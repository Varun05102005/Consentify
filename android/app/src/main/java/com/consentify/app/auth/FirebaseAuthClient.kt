package com.consentify.app.auth

import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class FirebaseAuthClient(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
) : AuthClient {
    override fun observeUid(): Flow<String?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser?.uid)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    override suspend fun signIn(email: String, password: String): String {
        return runAuth { auth.signInWithEmailAndPassword(email, password).await().user?.uid }
    }

    override suspend fun createAccount(email: String, password: String): String {
        return runAuth { auth.createUserWithEmailAndPassword(email, password).await().user?.uid }
    }

    override suspend fun signOut() {
        auth.signOut()
    }

    private suspend fun runAuth(block: suspend () -> String?): String {
        try {
            val uid = block()
            if (uid.isNullOrBlank()) {
                throw AuthClientException("unknown", AuthMessages.GENERIC)
            }
            return uid
        } catch (error: AuthClientException) {
            throw error
        } catch (error: Throwable) {
            throw AuthClientException(firebaseAuthCode(error), AuthMessages.GENERIC)
        }
    }
}

internal fun firebaseAuthCode(error: Throwable): String {
    return when (error) {
        is FirebaseNetworkException -> "ERROR_NETWORK_REQUEST_FAILED"
        is FirebaseAuthException -> error.errorCode
        else -> error::class.java.simpleName
    }
}

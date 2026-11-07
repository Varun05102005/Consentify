package com.consentify.app.auth

object AuthMessages {
    const val ENTER_EMAIL_PASSWORD = "Enter your email and password."
    const val INVALID_EMAIL = "Enter a valid email address."
    const val WEAK_PASSWORD = "Password must be at least 6 characters."
    const val EMAIL_IN_USE = "An account with this email already exists."
    const val INVALID_CREDENTIALS = "Incorrect email or password."
    const val NETWORK = "Network error. Check your connection and try again."
    const val TOO_MANY = "Too many attempts. Try again later."
    const val DISABLED = "This account has been disabled."
    const val UNAVAILABLE = "Email sign-in is not available right now."
    const val GENERIC = "Unable to complete sign-in. Please try again."
}

object AuthValidation {
    const val MIN_PASSWORD_LENGTH = 6
    private val EMAIL = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    fun validate(email: String, password: String): String? {
        val trimmed = email.trim()
        if (trimmed.isEmpty() || password.isEmpty()) {
            return AuthMessages.ENTER_EMAIL_PASSWORD
        }
        if (!EMAIL.matches(trimmed)) {
            return AuthMessages.INVALID_EMAIL
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return AuthMessages.WEAK_PASSWORD
        }
        return null
    }
}

fun authErrorMessage(error: Throwable): String {
    val code = (error as? AuthClientException)?.code.orEmpty().lowercase()
    return when {
        code.contains("invalid-email") || code.contains("error_invalid_email") ->
            AuthMessages.INVALID_EMAIL
        code.contains("weak-password") || code.contains("error_weak_password") ->
            AuthMessages.WEAK_PASSWORD
        code.contains("email-already-in-use") || code.contains("error_email_already_in_use") ->
            AuthMessages.EMAIL_IN_USE
        code.contains("wrong-password") ||
            code.contains("user-not-found") ||
            code.contains("invalid-credential") ||
            code.contains("invalid-login") ||
            code.contains("error_wrong_password") ||
            code.contains("error_user_not_found") ||
            code.contains("error_invalid_credential") ->
            AuthMessages.INVALID_CREDENTIALS
        code.contains("network") || code.contains("error_network") ->
            AuthMessages.NETWORK
        code.contains("too-many") || code.contains("error_too_many") ->
            AuthMessages.TOO_MANY
        code.contains("user-disabled") || code.contains("error_user_disabled") ->
            AuthMessages.DISABLED
        code.contains("operation-not-allowed") || code.contains("error_operation_not_allowed") ->
            AuthMessages.UNAVAILABLE
        else -> AuthMessages.GENERIC
    }
}

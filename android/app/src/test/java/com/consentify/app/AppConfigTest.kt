package com.consentify.app

import org.junit.Assert.assertEquals
import org.junit.Test

class AppConfigTest {
    @Test
    fun applicationIdMatchesConsentify() {
        assertEquals("com.consentify.app", BuildConfig.APPLICATION_ID)
    }

    @Test
    fun sdkLevelsMatchPhase8da() {
        assertEquals(26, BuildConfig.CONSENTIFY_MIN_SDK)
        assertEquals(35, BuildConfig.CONSENTIFY_TARGET_SDK)
        assertEquals(35, BuildConfig.CONSENTIFY_COMPILE_SDK)
    }

    @Test
    fun shellVersionIsInitial() {
        assertEquals(1, BuildConfig.VERSION_CODE)
        assertEquals("0.1.0", BuildConfig.VERSION_NAME)
    }
}

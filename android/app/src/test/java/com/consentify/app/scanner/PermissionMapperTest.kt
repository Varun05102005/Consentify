package com.consentify.app.scanner

import com.consentify.app.scanner.AndroidPermissionNames as P
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissionMapperTest {
    private val mapper = PermissionMapper()

    @Test
    fun cameraMapsToCamera() {
        val facts = mapper.map(listOf(granted(P.CAMERA)), sdkInt = 34)
        assertEquals(PermissionType.CAMERA, facts.single().consentifyType)
        assertEquals("Camera", facts.single().label)
    }

    @Test
    fun recordAudioMapsToMicrophone() {
        val facts = mapper.map(listOf(granted(P.RECORD_AUDIO)), sdkInt = 34)
        assertEquals(PermissionType.MICROPHONE, facts.single().consentifyType)
        assertEquals("Microphone", facts.single().label)
    }

    @Test
    fun coarseAndFineLocationBecomeOneLocationFact() {
        val facts = mapper.map(
            listOf(granted(P.ACCESS_COARSE_LOCATION), granted(P.ACCESS_FINE_LOCATION)),
            sdkInt = 34,
        )
        assertEquals(1, facts.size)
        assertEquals(PermissionType.LOCATION, facts.single().consentifyType)
        assertEquals("Location", facts.single().label)
        assertFalse(facts.single().backgroundAccess)
    }

    @Test
    fun contactsPermissionsBecomeOneContactsFact() {
        val facts = mapper.map(
            listOf(granted(P.READ_CONTACTS), denied(P.WRITE_CONTACTS), granted(P.GET_ACCOUNTS)),
            sdkInt = 34,
        )
        assertEquals(1, facts.size)
        assertEquals(PermissionType.CONTACTS, facts.single().consentifyType)
        assertEquals(PermissionStatus.GRANTED, facts.single().status)
    }

    @Test
    fun mediaPermissionsBecomePhotos() {
        val facts = mapper.map(
            listOf(granted(P.READ_MEDIA_IMAGES), granted(P.READ_MEDIA_VIDEO)),
            sdkInt = 34,
        )
        assertEquals(1, facts.size)
        assertEquals(PermissionType.PHOTOS, facts.single().consentifyType)
        assertEquals(PermissionStatus.GRANTED, facts.single().status)
    }

    @Test
    fun legacyStorageMapsToStorage() {
        val facts = mapper.map(
            listOf(denied(P.READ_EXTERNAL_STORAGE), denied(P.WRITE_EXTERNAL_STORAGE)),
            sdkInt = 32,
        )
        assertEquals(PermissionType.STORAGE, facts.single().consentifyType)
        assertEquals("Storage", facts.single().label)
        assertEquals(PermissionStatus.DENIED, facts.single().status)
    }

    @Test
    fun activityRecognitionAndBodySensorsBecomeSensors() {
        val facts = mapper.map(
            listOf(granted(P.ACTIVITY_RECOGNITION), denied(P.BODY_SENSORS)),
            sdkInt = 34,
        )
        assertEquals(1, facts.size)
        assertEquals(PermissionType.SENSORS, facts.single().consentifyType)
        assertEquals(PermissionStatus.GRANTED, facts.single().status)
        assertFalse(facts.single().backgroundAccess)
    }

    @Test
    fun postNotificationsMapsToNotificationsOnApi33() {
        val facts = mapper.map(listOf(granted(P.POST_NOTIFICATIONS)), sdkInt = 33)
        assertEquals(PermissionType.NOTIFICATIONS, facts.single().consentifyType)
        assertEquals("Notifications", facts.single().label)
    }

    @Test
    fun unknownPermissionIsIgnored() {
        val facts = mapper.map(
            listOf(granted("com.example.CUSTOM_PERMISSION"), granted(P.CAMERA)),
            sdkInt = 34,
        )
        assertEquals(listOf(PermissionType.CAMERA), facts.map { it.consentifyType })
    }

    @Test
    fun grantedEvidenceBecomesGranted() {
        val fact = mapper.map(listOf(granted(P.CAMERA)), sdkInt = 34).single()
        assertEquals(PermissionStatus.GRANTED, fact.status)
    }

    @Test
    fun requestedButDeniedBecomesDenied() {
        val fact = mapper.map(listOf(denied(P.RECORD_AUDIO)), sdkInt = 34).single()
        assertEquals(PermissionStatus.DENIED, fact.status)
    }

    @Test
    fun unsupportedStateBecomesUnknown() {
        val fact = mapper.map(
            listOf(RawAndroidPermission(P.CAMERA, requested = true, GrantEvidence.UNKNOWN)),
            sdkInt = 34,
        ).single()
        assertEquals(PermissionStatus.UNKNOWN, fact.status)
    }

    @Test
    fun selectedOnlyMediaBecomesRestrictedPhotos() {
        val facts = mapper.map(
            listOf(
                denied(P.READ_MEDIA_IMAGES),
                denied(P.READ_MEDIA_VIDEO),
                granted(P.READ_MEDIA_VISUAL_USER_SELECTED),
            ),
            sdkInt = 34,
        )
        val photos = facts.single { it.consentifyType == PermissionType.PHOTOS }
        assertEquals(PermissionStatus.RESTRICTED, photos.status)
        assertEquals("Photos", photos.label)
    }

    @Test
    fun backgroundLocationSetsBackgroundAccess() {
        val fact = mapper.map(
            listOf(granted(P.ACCESS_FINE_LOCATION), granted(P.ACCESS_BACKGROUND_LOCATION)),
            sdkInt = 34,
        ).single()
        assertEquals(PermissionType.LOCATION, fact.consentifyType)
        assertTrue(fact.backgroundAccess)
        assertEquals(PermissionStatus.GRANTED, fact.status)
    }

    @Test
    fun backgroundBodySensorsSetsBackgroundAccess() {
        val fact = mapper.map(
            listOf(granted(P.BODY_SENSORS), granted(P.BODY_SENSORS_BACKGROUND)),
            sdkInt = 34,
        ).single()
        assertEquals(PermissionType.SENSORS, fact.consentifyType)
        assertTrue(fact.backgroundAccess)
    }

    @Test
    fun foregroundPermissionAloneDoesNotInferBackground() {
        val location = mapper.map(listOf(granted(P.ACCESS_FINE_LOCATION)), sdkInt = 34).single()
        val sensors = mapper.map(listOf(granted(P.BODY_SENSORS)), sdkInt = 34).single()
        assertFalse(location.backgroundAccess)
        assertFalse(sensors.backgroundAccess)
    }

    @Test
    fun deniedBackgroundPermissionDoesNotInferBackgroundFromForegroundGrant() {
        val fact = mapper.map(
            listOf(granted(P.ACCESS_FINE_LOCATION), denied(P.ACCESS_BACKGROUND_LOCATION)),
            sdkInt = 34,
        ).single()
        assertEquals(PermissionStatus.GRANTED, fact.status)
        assertFalse(fact.backgroundAccess)
    }

    @Test
    fun mixedGrantedAndDeniedResolveToGranted() {
        val fact = mapper.map(
            listOf(granted(P.ACCESS_COARSE_LOCATION), denied(P.ACCESS_FINE_LOCATION)),
            sdkInt = 34,
        ).single()
        assertEquals(PermissionStatus.GRANTED, fact.status)
    }

    @Test
    fun manageExternalStorageDoesNotPretendAppOpsAreGranted() {
        val fact = mapper.map(
            listOf(granted(P.MANAGE_EXTERNAL_STORAGE)),
            sdkInt = 34,
        ).single()
        assertEquals(PermissionType.STORAGE, fact.consentifyType)
        assertEquals(PermissionStatus.UNKNOWN, fact.status)
    }

    @Test
    fun ignoredPermissionsDoNotBecomeFacts() {
        val facts = mapper.map(
            listOf(
                granted(P.INTERNET),
                granted(P.ACCESS_NETWORK_STATE),
                granted(P.VIBRATE),
                granted(P.WAKE_LOCK),
                granted(P.RECEIVE_BOOT_COMPLETED),
                granted(P.AD_ID),
                granted(P.PLAY_BILLING),
                granted(P.CAPTURE_AUDIO_OUTPUT),
                granted("android.permission.FOREGROUND_SERVICE"),
                granted("android.permission.FOREGROUND_SERVICE_CAMERA"),
                granted(P.SYSTEM_ALERT_WINDOW),
                granted(P.PACKAGE_USAGE_STATS),
                granted(P.REQUEST_INSTALL_PACKAGES),
            ),
            sdkInt = 34,
        )
        assertTrue(facts.isEmpty())
    }

    @Test
    fun labelsAreUserFacingNotAndroidNames() {
        val facts = mapper.map(
            listOf(
                granted(P.CAMERA),
                granted(P.RECORD_AUDIO),
                granted(P.ACCESS_FINE_LOCATION),
                granted(P.READ_CONTACTS),
                granted(P.READ_EXTERNAL_STORAGE),
                granted(P.READ_MEDIA_IMAGES),
                granted(P.POST_NOTIFICATIONS),
                granted(P.BODY_SENSORS),
            ),
            sdkInt = 34,
        )
        assertTrue(facts.all { !it.label.startsWith("android.permission") })
        assertEquals(
            listOf(
                "Camera",
                "Microphone",
                "Location",
                "Contacts",
                "Storage",
                "Photos",
                "Notifications",
                "Sensors",
            ),
            facts.map { it.label },
        )
    }
}

class ApiLevelFixtureTest {
    private val mapper = PermissionMapper()

    @Test
    fun api32LegacyStorageAndNoRuntimeNotifications() {
        val facts = mapper.map(
            listOf(
                granted(P.CAMERA),
                denied(P.READ_EXTERNAL_STORAGE),
                granted(P.POST_NOTIFICATIONS),
                granted(P.READ_MEDIA_IMAGES),
            ),
            sdkInt = 32,
        )
        assertEquals(PermissionStatus.GRANTED, facts.single { it.consentifyType == PermissionType.CAMERA }.status)
        assertEquals(PermissionStatus.DENIED, facts.single { it.consentifyType == PermissionType.STORAGE }.status)
        assertNull(facts.find { it.consentifyType == PermissionType.NOTIFICATIONS })
        assertNull(facts.find { it.consentifyType == PermissionType.PHOTOS })
    }

    @Test
    fun api33NotificationsAndGranularMedia() {
        val facts = mapper.map(
            listOf(
                denied(P.POST_NOTIFICATIONS),
                granted(P.READ_MEDIA_IMAGES),
                denied(P.READ_EXTERNAL_STORAGE),
                granted(P.READ_MEDIA_VISUAL_USER_SELECTED),
            ),
            sdkInt = 33,
        )
        assertEquals(
            PermissionStatus.DENIED,
            facts.single { it.consentifyType == PermissionType.NOTIFICATIONS }.status,
        )
        assertEquals(PermissionStatus.GRANTED, facts.single { it.consentifyType == PermissionType.PHOTOS }.status)
        assertEquals(PermissionStatus.DENIED, facts.single { it.consentifyType == PermissionType.STORAGE }.status)
        assertNull(
            facts.find { it.consentifyType == PermissionType.PHOTOS && it.status == PermissionStatus.RESTRICTED },
        )
    }

    @Test
    fun api34SelectedPhotosWithoutFullMediaIsRestricted() {
        val facts = mapper.map(
            listOf(
                granted(P.POST_NOTIFICATIONS),
                denied(P.READ_MEDIA_IMAGES),
                denied(P.READ_MEDIA_VIDEO),
                granted(P.READ_MEDIA_VISUAL_USER_SELECTED),
                granted(P.READ_EXTERNAL_STORAGE),
            ),
            sdkInt = 34,
        )
        assertEquals(
            PermissionStatus.GRANTED,
            facts.single { it.consentifyType == PermissionType.NOTIFICATIONS }.status,
        )
        assertEquals(
            PermissionStatus.RESTRICTED,
            facts.single { it.consentifyType == PermissionType.PHOTOS }.status,
        )
        assertEquals(PermissionStatus.GRANTED, facts.single { it.consentifyType == PermissionType.STORAGE }.status)
    }
}

private fun granted(name: String) = RawAndroidPermission(name, true, GrantEvidence.GRANTED)

private fun denied(name: String) = RawAndroidPermission(name, true, GrantEvidence.DENIED)

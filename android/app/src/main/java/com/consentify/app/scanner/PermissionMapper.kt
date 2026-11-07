package com.consentify.app.scanner

import com.consentify.app.scanner.AndroidPermissionNames as P

/**
 * Pure mapping from raw Android permission facts to Consentify facts.
 *
 * Does not call PackageManager, Firebase, or the web risk engine.
 */
class PermissionMapper {
    fun map(
        permissions: List<RawAndroidPermission>,
        sdkInt: Int,
    ): List<ScannedPermissionFact> {
        val buckets = LinkedHashMap<PermissionType, TypeBucket>()

        for (raw in permissions) {
            if (!raw.requested) continue
            val route = route(raw.name, sdkInt) ?: continue
            val bucket = buckets.getOrPut(route.type) { TypeBucket() }
            when (route.role) {
                PermissionRole.BACKGROUND -> {
                    bucket.backgroundGranted = bucket.backgroundGranted ||
                        raw.grantEvidence == GrantEvidence.GRANTED
                    applyEvidence(bucket, coerceAppOpsEvidence(raw))
                }
                PermissionRole.SELECTED_PHOTOS -> {
                    if (raw.grantEvidence == GrantEvidence.GRANTED) {
                        bucket.selectedPhotosGranted = true
                    }
                    applyEvidence(bucket, raw.grantEvidence)
                }
                PermissionRole.FULL_MEDIA -> {
                    if (raw.grantEvidence == GrantEvidence.GRANTED) {
                        bucket.fullMediaGranted = true
                    }
                    applyEvidence(bucket, raw.grantEvidence)
                }
                PermissionRole.PRIMARY -> applyEvidence(bucket, coerceAppOpsEvidence(raw))
            }
        }

        return PermissionType.entries.mapNotNull { type ->
            val bucket = buckets[type] ?: return@mapNotNull null
            ScannedPermissionFact(
                consentifyType = type,
                label = type.label,
                status = statusOf(type, bucket),
                backgroundAccess = bucket.backgroundGranted,
            )
        }
    }

    private fun coerceAppOpsEvidence(raw: RawAndroidPermission): GrantEvidence {
        return if (raw.name == P.MANAGE_EXTERNAL_STORAGE) {
            GrantEvidence.UNKNOWN
        } else {
            raw.grantEvidence
        }
    }

    private fun applyEvidence(bucket: TypeBucket, evidence: GrantEvidence) {
        when (evidence) {
            GrantEvidence.GRANTED -> bucket.anyGranted = true
            GrantEvidence.DENIED -> bucket.anyDenied = true
            GrantEvidence.UNKNOWN -> Unit
        }
    }

    private fun statusOf(type: PermissionType, bucket: TypeBucket): PermissionStatus {
        if (type == PermissionType.PHOTOS && photosAreSelectedOnly(bucket)) {
            return PermissionStatus.RESTRICTED
        }
        if (bucket.anyGranted) {
            return PermissionStatus.GRANTED
        }
        if (bucket.anyDenied) {
            return PermissionStatus.DENIED
        }
        return PermissionStatus.UNKNOWN
    }

    private fun photosAreSelectedOnly(bucket: TypeBucket): Boolean {
        return bucket.selectedPhotosGranted && !bucket.fullMediaGranted
    }

    private fun route(name: String, sdkInt: Int): Route? {
        if (isIgnored(name)) return null
        return when (name) {
            P.CAMERA -> Route(PermissionType.CAMERA, PermissionRole.PRIMARY)
            P.RECORD_AUDIO -> Route(PermissionType.MICROPHONE, PermissionRole.PRIMARY)
            P.POST_NOTIFICATIONS ->
                if (sdkInt >= 33) Route(PermissionType.NOTIFICATIONS, PermissionRole.PRIMARY) else null

            P.ACCESS_COARSE_LOCATION,
            P.ACCESS_FINE_LOCATION,
            -> Route(PermissionType.LOCATION, PermissionRole.PRIMARY)
            P.ACCESS_BACKGROUND_LOCATION ->
                Route(PermissionType.LOCATION, PermissionRole.BACKGROUND)

            P.READ_CONTACTS,
            P.WRITE_CONTACTS,
            P.GET_ACCOUNTS,
            -> Route(PermissionType.CONTACTS, PermissionRole.PRIMARY)

            P.READ_MEDIA_IMAGES,
            P.READ_MEDIA_VIDEO,
            ->
                if (sdkInt >= 33) Route(PermissionType.PHOTOS, PermissionRole.FULL_MEDIA) else null
            P.READ_MEDIA_VISUAL_USER_SELECTED ->
                if (sdkInt >= 34) Route(PermissionType.PHOTOS, PermissionRole.SELECTED_PHOTOS) else null

            P.READ_EXTERNAL_STORAGE,
            P.WRITE_EXTERNAL_STORAGE,
            -> Route(PermissionType.STORAGE, PermissionRole.PRIMARY)
            P.MANAGE_EXTERNAL_STORAGE ->
                Route(PermissionType.STORAGE, PermissionRole.PRIMARY)

            P.ACTIVITY_RECOGNITION,
            P.BODY_SENSORS,
            -> Route(PermissionType.SENSORS, PermissionRole.PRIMARY)
            P.BODY_SENSORS_BACKGROUND ->
                Route(PermissionType.SENSORS, PermissionRole.BACKGROUND)

            else -> null
        }
    }

    private fun isIgnored(name: String): Boolean {
        if (name.startsWith(P.FOREGROUND_SERVICE_PREFIX)) return true
        return name in IGNORED
    }

    private data class Route(
        val type: PermissionType,
        val role: PermissionRole,
    )

    private enum class PermissionRole {
        PRIMARY,
        BACKGROUND,
        FULL_MEDIA,
        SELECTED_PHOTOS,
    }

    private class TypeBucket {
        var anyGranted: Boolean = false
        var anyDenied: Boolean = false
        var backgroundGranted: Boolean = false
        var selectedPhotosGranted: Boolean = false
        var fullMediaGranted: Boolean = false
    }

    companion object {
        private val IGNORED = setOf(
            P.INTERNET,
            P.ACCESS_NETWORK_STATE,
            P.VIBRATE,
            P.WAKE_LOCK,
            P.RECEIVE_BOOT_COMPLETED,
            P.AD_ID,
            P.PLAY_BILLING,
            P.CAPTURE_AUDIO_OUTPUT,
            P.CAPTURE_VIDEO_OUTPUT,
            P.CAPTURE_SECURE_VIDEO_OUTPUT,
            P.SYSTEM_ALERT_WINDOW,
            P.PACKAGE_USAGE_STATS,
            P.REQUEST_INSTALL_PACKAGES,
        )
    }
}

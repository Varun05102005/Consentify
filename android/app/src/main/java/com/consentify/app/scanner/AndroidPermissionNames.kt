package com.consentify.app.scanner

/**
 * Android permission names used by the mapper. Kept as strings so mapping
 * stays a pure JVM unit, independent of `android.Manifest`.
 */
internal object AndroidPermissionNames {
    const val CAMERA = "android.permission.CAMERA"
    const val RECORD_AUDIO = "android.permission.RECORD_AUDIO"
    const val POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS"

    const val ACCESS_COARSE_LOCATION = "android.permission.ACCESS_COARSE_LOCATION"
    const val ACCESS_FINE_LOCATION = "android.permission.ACCESS_FINE_LOCATION"
    const val ACCESS_BACKGROUND_LOCATION = "android.permission.ACCESS_BACKGROUND_LOCATION"

    const val READ_CONTACTS = "android.permission.READ_CONTACTS"
    const val WRITE_CONTACTS = "android.permission.WRITE_CONTACTS"
    const val GET_ACCOUNTS = "android.permission.GET_ACCOUNTS"

    const val READ_MEDIA_IMAGES = "android.permission.READ_MEDIA_IMAGES"
    const val READ_MEDIA_VIDEO = "android.permission.READ_MEDIA_VIDEO"
    const val READ_MEDIA_VISUAL_USER_SELECTED = "android.permission.READ_MEDIA_VISUAL_USER_SELECTED"

    const val READ_EXTERNAL_STORAGE = "android.permission.READ_EXTERNAL_STORAGE"
    const val WRITE_EXTERNAL_STORAGE = "android.permission.WRITE_EXTERNAL_STORAGE"
    const val MANAGE_EXTERNAL_STORAGE = "android.permission.MANAGE_EXTERNAL_STORAGE"

    const val ACTIVITY_RECOGNITION = "android.permission.ACTIVITY_RECOGNITION"
    const val BODY_SENSORS = "android.permission.BODY_SENSORS"
    const val BODY_SENSORS_BACKGROUND = "android.permission.BODY_SENSORS_BACKGROUND"

    const val INTERNET = "android.permission.INTERNET"
    const val ACCESS_NETWORK_STATE = "android.permission.ACCESS_NETWORK_STATE"
    const val VIBRATE = "android.permission.VIBRATE"
    const val WAKE_LOCK = "android.permission.WAKE_LOCK"
    const val RECEIVE_BOOT_COMPLETED = "android.permission.RECEIVE_BOOT_COMPLETED"
    const val AD_ID = "com.google.android.gms.permission.AD_ID"
    const val PLAY_BILLING = "com.android.vending.BILLING"
    const val CAPTURE_AUDIO_OUTPUT = "android.permission.CAPTURE_AUDIO_OUTPUT"
    const val CAPTURE_VIDEO_OUTPUT = "android.permission.CAPTURE_VIDEO_OUTPUT"
    const val CAPTURE_SECURE_VIDEO_OUTPUT = "android.permission.CAPTURE_SECURE_VIDEO_OUTPUT"

    const val SYSTEM_ALERT_WINDOW = "android.permission.SYSTEM_ALERT_WINDOW"
    const val PACKAGE_USAGE_STATS = "android.permission.PACKAGE_USAGE_STATS"
    const val REQUEST_INSTALL_PACKAGES = "android.permission.REQUEST_INSTALL_PACKAGES"

    const val FOREGROUND_SERVICE_PREFIX = "android.permission.FOREGROUND_SERVICE"
}

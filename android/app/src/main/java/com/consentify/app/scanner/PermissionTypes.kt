package com.consentify.app.scanner

/**
 * Consentify permission types. Values match the existing web schema and
 * must not be expanded in this phase.
 */
enum class PermissionType(val wireValue: String, val label: String) {
    CAMERA("camera", "Camera"),
    MICROPHONE("microphone", "Microphone"),
    LOCATION("location", "Location"),
    CONTACTS("contacts", "Contacts"),
    STORAGE("storage", "Storage"),
    PHOTOS("photos", "Photos"),
    NOTIFICATIONS("notifications", "Notifications"),
    SENSORS("sensors", "Sensors"),
    OTHER("other", "Other"),
}

enum class PermissionStatus(val wireValue: String) {
    GRANTED("granted"),
    DENIED("denied"),
    RESTRICTED("restricted"),
    UNKNOWN("unknown"),
}

enum class GrantEvidence {
    GRANTED,
    DENIED,
    UNKNOWN,
}

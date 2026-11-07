package com.consentify.app.scanner

import android.content.Context
import android.os.Build

/**
 * Device-facing entry point. Local only: does not upload, persist, or call
 * Firebase. The scanner ViewModel uploads facts through FirestoreScanUploader.
 */
class AndroidPermissionScanner(
    context: Context,
    private val sdkInt: Int = Build.VERSION.SDK_INT,
    clock: () -> Long = { System.currentTimeMillis() },
) {
    private val scanner = PermissionScanner(
        discovery = AndroidPackageDiscovery(context.packageManager),
        inspector = AndroidPermissionInspector(context.packageManager),
        mapper = PermissionMapper(),
        sdkInt = sdkInt,
        clock = clock,
    )

    fun scan(): ScanResult = scanner.scan()
}

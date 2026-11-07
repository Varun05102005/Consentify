package com.consentify.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Navy,
    onPrimary = TextOnAccent,
    primaryContainer = NavySoft,
    onPrimaryContainer = Navy,
    secondary = CyanInfo,
    onSecondary = TextOnAccent,
    background = Canvas,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    onSurfaceVariant = TextMuted,
    surfaceVariant = CanvasSubtle,
    error = RiskHigh,
    onError = TextOnAccent,
    tertiary = RiskMedium,
    outline = TextSecondary,
)

private val DarkColors = darkColorScheme(
    primary = NavyDark,
    onPrimary = Inverse,
    primaryContainer = NavyHover,
    onPrimaryContainer = NavySoft,
    secondary = CyanInfo,
    onSecondary = Inverse,
    background = CanvasDark,
    onBackground = TextPrimaryDark,
    surface = SurfaceDark,
    onSurface = TextPrimaryDark,
    onSurfaceVariant = TextMuted,
    error = RiskHigh,
    onError = TextOnAccent,
    tertiary = RiskMedium,
)

@Composable
fun ConsentifyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = ConsentifyTypography,
        content = content,
    )
}

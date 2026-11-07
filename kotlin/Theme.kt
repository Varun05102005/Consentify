package com.consentify.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DeepBlue = Color(0xFF1E3A8A)
private val Cyan = Color(0xFF06B6D4)
private val Orange = Color(0xFFF97316)
private val LightGray = Color(0xFFF5F7FA)

private val HighRisk = Color(0xFFEF4444)
private val MediumRisk = Color(0xFFF97316)
private val Safe = Color(0xFF10B981)

private val LightColorScheme = lightColorScheme(
    primary = DeepBlue,
    secondary = Cyan,
    tertiary = Orange,
    background = LightGray,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF1F2937),
    onSurface = Color(0xFF1F2937),
)

@Composable
fun ConsentifyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        // Simple dark mode fallback
        darkColorScheme(primary = Cyan, secondary = DeepBlue)
    } else {
        LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

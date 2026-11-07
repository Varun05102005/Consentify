package com.consentify.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.consentify.ui.screens.*
import com.consentify.ui.theme.ConsentifyTheme

sealed class Screen(val route: String, val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    object Splash : Screen("splash", "Splash", Icons.Default.Shield)
    object Auth : Screen("auth", "Auth", Icons.Default.Fingerprint)
    object Dashboard : Screen("dashboard", "Home", Icons.Default.Dashboard)
    object Apps : Screen("apps", "Apps", Icons.Default.Smartphone)
    object Alerts : Screen("alerts", "Alerts", Icons.Default.Notifications)
    object Analytics : Screen("analytics", "Stats", Icons.Default.PieChart)
    object Settings : Screen("settings", "Settings", Icons.Default.Settings)
}

@Composable
fun ConsentifyApp() {
    val navController = rememberNavController()
    val items = listOf(
        Screen.Dashboard,
        Screen.Apps,
        Screen.Alerts,
        Screen.Analytics,
        Screen.Settings
    )

    ConsentifyTheme {
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = navBackStackEntry?.destination?.route
        val showBottomBar = currentRoute != Screen.Splash.route && currentRoute != Screen.Auth.route

        Scaffold(
            bottomBar = {
                if (showBottomBar) {
                    NavigationBar(
                        containerColor = androidx.compose.ui.graphics.Color.White,
                        tonalElevation = 8.dp
                    ) {
                        items.forEach { screen ->
                            NavigationBarItem(
                                icon = { Icon(screen.icon, contentDescription = screen.title) },
                                label = { Text(screen.title) },
                                selected = currentRoute == screen.route,
                                onClick = {
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.startDestinationId) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            )
                        }
                    }
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Auth.route,
                modifier = Modifier.padding(innerPadding)
            ) {
                composable(Screen.Auth.route) { 
                    BiometricAuthenticationScreen(onAuthenticated = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Auth.route) { inclusive = true }
                        }
                    })
                }
                composable(Screen.Dashboard.route) { DashboardScreen() }
                composable(Screen.Apps.route) { 
                    // Pass mock data
                    AppListScreen(emptyList()) { /* Navigate to details */ } 
                }
                composable(Screen.Alerts.route) { /* AlertsScreen() */ }
                composable(Screen.Analytics.route) { /* AnalyticsScreen() */ }
                composable(Screen.Settings.route) { /* SettingsScreen() */ }
            }
        }
    }
}

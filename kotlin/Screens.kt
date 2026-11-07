package com.consentify.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// --- Data Models ---
data class AppInfo(
    val id: String,
    val name: String,
    val icon: String,
    val permissions: List<String>,
    val risk: RiskLevel
)

enum class RiskLevel { High, Medium, Safe }

// --- Reusable Components ---

@Composable
fun RiskBadge(risk: RiskLevel) {
    val color = when (risk) {
        RiskLevel.High -> Color(0xFFEF4444)
        RiskLevel.Medium -> Color(0xFFF97316)
        RiskLevel.Safe -> Color(0xFF10B981)
    }
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(50),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.2f))
    ) {
        Text(
            text = risk.name.uppercase(),
            color = color,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun StatCard(label: String, value: String, icon: ImageVector, iconColor: Color) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(iconColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = value, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(text = label, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

// --- Screens ---

@Composable
fun DashboardScreen() {
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* Scan */ },
                containerColor = Color(0xFFF97316),
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Search, contentDescription = "Scan")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Column {
                    Text(text = "Hello, Varun", fontSize = 14.sp, color = Color.Gray)
                    Text(text = "Privacy Overview", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        StatCard("Total Apps", "124", Icons.Default.PhoneAndroid, Color.Blue)
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        StatCard("High Risk", "12", Icons.Default.Warning, Color.Red)
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(32.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E3A8A))
                ) {
                    Row(
                        modifier = Modifier.padding(24.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(text = "Privacy Score", color = Color.White.copy(alpha = 0.7f), fontSize = 14.sp)
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(text = "78", color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
                                Text(text = "/100", color = Color.White.copy(alpha = 0.5f), fontSize = 18.sp, modifier = Modifier.padding(bottom = 6.dp))
                            }
                        }
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Shield, contentDescription = null, tint = Color(0xFF06B6D4), modifier = Modifier.size(40.dp))
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Recent Alerts", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    TextButton(onClick = { }) {
                        Text(text = "View All", color = Color(0xFF1E3A8A))
                    }
                }
            }

            // Sample Alert List
            items(2) {
                AlertItem()
            }
        }
    }
}

@Composable
fun AlertItem() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Red.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = Color.Red)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "Calculator", fontWeight = FontWeight.Bold)
                Text(text = "Location access detected", fontSize = 12.sp, color = Color.Gray)
            }
            Text(text = "2m ago", fontSize = 10.sp, color = Color.LightGray)
        }
    }
}

@Composable
fun AppListScreen(apps: List<AppInfo>, onAppClick: (AppInfo) -> Unit) {
    Column(modifier = Modifier.padding(24.dp)) {
        Text(text = "Installed Apps", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = "",
            onValueChange = {},
            placeholder = { Text("Search apps...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = TextFieldDefaults.colors(
                unfocusedContainerColor = Color.White,
                focusedContainerColor = Color.White
            )
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(apps) { app ->
                AppCard(app, onAppClick)
            }
        }
    }
}

@Composable
fun BiometricAuthenticationScreen(onAuthenticated: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF5F7FA))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(top = 48.dp)
        ) {
            Surface(
                modifier = Modifier.size(64.dp),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Shield,
                        contentDescription = null,
                        tint = Color(0xFF1E3A8A),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Welcome Back",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1F2937)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Authenticate to access your privacy dashboard",
                fontSize = 14.sp,
                color = Color.Gray,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }

        IconButton(
            onClick = onAuthenticated,
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(Color.White)
                .padding(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(Color(0xFF06B6D4).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Fingerprint,
                    contentDescription = "Fingerprint",
                    tint = Color(0xFF1E3A8A),
                    modifier = Modifier.size(48.dp)
                )
            }
        }

        TextButton(onClick = { /* PIN Fallback */ }) {
            Text(
                text = "Use PIN Fallback",
                color = Color.Gray,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun AppCard(app: AppInfo, onClick: (AppInfo) -> Unit) {
    Card(
        onClick = { onClick(app) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFFF3F4F6)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = app.icon, fontSize = 24.sp)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = app.name, fontWeight = FontWeight.Bold)
                Text(text = app.permissions.joinToString(", "), fontSize = 12.sp, color = Color.Gray, maxLines = 1)
            }
            RiskBadge(app.risk)
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.LightGray)
        }
    }
}

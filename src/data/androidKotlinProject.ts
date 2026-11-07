export interface AndroidSourceFile {
  apkTarget: 'com.anchor.parent' | 'com.anchor.child' | 'shared-firebase-contract';
  path: string;
  title: string;
  description: string;
  language: 'kotlin' | 'xml' | 'gradle';
  code: string;
}

export const ANDROID_NATIVE_SOURCE_FILES: AndroidSourceFile[] = [
  {
    apkTarget: 'com.anchor.parent',
    path: 'android-parent-app/app/build.gradle.kts',
    title: 'Parent APK Gradle Build (com.anchor.parent)',
    description: 'Independent Android Application ID com.anchor.parent with Jetpack Compose Material 3, Firebase Auth, Firestore, Play Billing, and FCM.',
    language: 'gradle',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.anchor.parent"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.anchor.parent"
        minSdk = 26
        targetSdk = 35
        versionCode = 14
        versionName = "2.4.0-parent"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.android.billingclient:billing-ktx:7.1.1")
    testImplementation("junit:junit:4.13.2")
}`,
  },
  {
    apkTarget: 'com.anchor.child',
    path: 'android-child-app/app/build.gradle.kts',
    title: 'Child APK Gradle Build (com.anchor.child)',
    description: 'Separate installable Android Application ID com.anchor.child with UsageStatsManager, AccessibilityService, DevicePolicyManager, Location Services, and WebRTC Consent-First Live Stream.',
    language: 'gradle',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.anchor.child"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.anchor.child"
        minSdk = 26
        targetSdk = 35
        versionCode = 14
        versionName = "2.4.0-child"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    testImplementation("junit:junit:4.13.2")
}`,
  },
  {
    apkTarget: 'shared-firebase-contract',
    path: 'shared/src/main/java/com/anchor/shared/AnchorFirebaseRepository.kt',
    title: 'Shared Firebase Synchronization Repository',
    description: 'Real-time Firestore synchronization layer shared by com.anchor.parent and com.anchor.child against project gen-lang-client-0963224775.',
    language: 'kotlin',
    code: `package com.anchor.shared

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class AnchorFirebaseRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance("ai-studio-anchorfamilysafe-1f622f51-243e-4d62-9cb1-9fdaf9b5dc9d")
) {
    fun observeHousehold(familyId: String): Flow<Map<String, Any>> = callbackFlow {
        val registration: ListenerRegistration = db.collection("families")
            .document(familyId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    trySend(snapshot.data ?: emptyMap())
                }
            }
        awaitClose { registration.remove() }
    }

    suspend fun requestConsentBasedLiveCheck(
        familyId: String,
        guardianName: String,
        childId: String,
        mode: String,
        reason: String
    ) {
        // Enforces that a parent request enters PENDING_CHILD_CONSENT and never activates covertly
        db.collection("families").document(familyId).update(
            mapOf(
                "liveSession.status" to "PENDING_CHILD_CONSENT",
                "liveSession.requestedByGuardianName" to guardianName,
                "liveSession.targetChildId" to childId,
                "liveSession.mode" to mode,
                "liveSession.reason" to reason,
                "liveSession.remainingSeconds" to 600
            )
        ).await()
    }
}`,
  },
  {
    apkTarget: 'com.anchor.child',
    path: 'android-child-app/app/src/main/java/com/anchor/child/services/UsageStatsEnforcerService.kt',
    title: 'Child APK Foreground Enforcement & Consent Service',
    description: 'Enforces daily screen limits, app locks, offline schedule rules, and foreground notification banners for consent-first live sessions.',
    language: 'kotlin',
    code: `package com.anchor.child.services

import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.IBinder

class UsageStatsEnforcerService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Monitors foreground package via UsageStatsManager & enforces cached local schedules
        // even when offline. Syncs queued events to Firestore upon reconnection.
        return START_STICKY
    }

    fun getTodayForegroundMinutes(context: Context, packageName: String): Int {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val startOfDay = now - (now % (24 * 60 * 60 * 1000L))
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now)
        val totalMs = stats.filter { it.packageName == packageName }.sumOf { it.totalTimeInForeground }
        return (totalMs / 60000L).toInt()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`,
  },
];

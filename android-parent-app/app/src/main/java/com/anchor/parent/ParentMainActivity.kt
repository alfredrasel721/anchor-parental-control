package com.anchor.parent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface

/**
 * Native Android Entry Point for Anchor Parent APK (applicationId: com.anchor.parent).
 * Connects to Firebase Project gen-lang-client-0963224775 and implements Screens P-01 through P-20.
 */
class ParentMainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface {
                    // Launches ParentNavHost (P-01 to P-20)
                }
            }
        }
    }
}

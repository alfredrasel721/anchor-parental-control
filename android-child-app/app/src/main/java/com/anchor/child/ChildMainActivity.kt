package com.anchor.child

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface

/**
 * Native Android Entry Point for Anchor Child APK (applicationId: com.anchor.child).
 * Independently installable supervised device APK implementing Screens C-01 through C-15.
 */
class ChildMainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface {
                    // Launches ChildNavHost (C-01 to C-15)
                }
            }
        }
    }
}

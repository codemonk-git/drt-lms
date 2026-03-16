package com.example.tss_leads

import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Create notification channel for Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            
            // Create channel with sound
            val channelId = "followup_notifications"
            val channelName = "Followup Notifications"
            val importance = NotificationManager.IMPORTANCE_HIGH
            
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()
            
            val channel = NotificationChannel(channelId, channelName, importance).apply {
                description = "Notifications for followup reminders"
                enableVibration(true)
                setShowBadge(true)
                setSound(soundUri, audioAttributes)
            }
            
            notificationManager.createNotificationChannel(channel)
        }
    }
}

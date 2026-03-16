import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

typedef NotificationTapCallback = void Function(String? payload);

/// Notification service for receiving push notifications from the backend.
/// The backend (FastAPI with APScheduler) handles scheduling notifications via Web Push.
/// This service only handles receiving and displaying notifications on the device.
class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static NotificationTapCallback? _onNotificationTap;

  static Future<void> init({NotificationTapCallback? onNotificationTap}) async {
    _onNotificationTap = onNotificationTap;

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsDarwin =
        DarwinInitializationSettings();

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsDarwin,
          macOS: initializationSettingsDarwin,
        );

    // Initialize timezones for scheduling
    tz_data.initializeTimeZones();

    await _notificationsPlugin.initialize(
      settings: initializationSettings,
      onDidReceiveNotificationResponse: (details) {
        print('📲 onDidReceiveNotificationResponse called');
        print('📲 Notification response payload: ${details.payload}');
        if (_onNotificationTap != null) {
          print(
            '📲 Calling notification tap callback with payload: ${details.payload}',
          );
          _onNotificationTap!(details.payload);
        } else {
          print('⚠️ No tap callback registered');
        }
      },
    );

    // Create notification channels (Android specific)
    await _createNotificationChannels();

    // Request permissions (important for Android 13+)
    final androidPlugin = _notificationsPlugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    if (androidPlugin != null) {
      try {
        await androidPlugin.requestNotificationsPermission();
      } catch (e) {
        // Silent fail
      }
    }
  }

  /// Create notification channels for different notification types
  static Future<void> _createNotificationChannels() async {
    final androidPlugin = _notificationsPlugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();

    if (androidPlugin != null) {
      // Create general notification channel
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'general_channel_id',
          'General Notifications',
          description: 'General notification channel',
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
        ),
      );

      // Create followup notification channel
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'followup_channel_id',
          'Followup Reminders',
          description: 'Notifications for scheduled followups',
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
        ),
      );

      // Create background notification channel
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'background_channel_id',
          'Background Notifications',
          description: 'Notifications while app is in background',
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
        ),
      );

      // Create test notification channel
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'test_channel_id',
          'Test Notifications',
          description: 'Channel for testing notifications',
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
        ),
      );
    }
  }

  static Future<void> showTestNotification() async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'test_channel_id',
          'Test Notifications',
          channelDescription: 'Channel for testing notifications',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
        );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
    );

    await _notificationsPlugin.show(
      id: 0,
      title: 'Test Notification',
      body: 'This is a test notification from TSS Leads!',
      notificationDetails: platformChannelSpecifics,
    );
  }

  static Future<void> showDelayedNotification() async {
    await _notificationsPlugin.zonedSchedule(
      id: 1,
      title: 'Background Test',
      body: 'This appeared after 5 seconds! (Background Test)',
      scheduledDate: tz.TZDateTime.now(
        tz.local,
      ).add(const Duration(seconds: 5)),
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'background_channel_id',
          'Background Notifications',
          channelDescription: 'Testing background behavior',
          importance: Importance.max,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
        macOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
    );
  }

  /// Show a generic notification (for FCM or other use cases)
  static Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    print('📢 NotificationService.show() called');
    print('   ID: $id, Title: $title, Body: $body');
    print('   Payload: $payload');

    final AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'general_channel_id',
          'General Notifications',
          channelDescription: 'General notification channel',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
          enableVibration: true,
        );

    final NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
    );

    try {
      await _notificationsPlugin.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: platformChannelSpecifics,
        payload: payload,
      );
      print('✅ Notification displayed successfully');
    } catch (e) {
      print('❌ Failed to show notification: $e');
    }
  }

  /// Show a followup reminder notification
  static Future<void> showFollowupNotification({
    required int id,
    required String followupType,
    required String leadName,
    required String? notes,
  }) async {
    final title = '${followupType.toUpperCase()} Reminder';
    String body = 'Time to follow up with $leadName';
    if (notes != null && notes.isNotEmpty) {
      if (notes.length > 50) {
        body += ': ${notes.substring(0, 50)}...';
      } else {
        body += ': $notes';
      }
    }

    final AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'followup_channel_id',
          'Followup Reminders',
          channelDescription: 'Notifications for scheduled followups',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
          enableVibration: true,
        );

    final NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
    );

    await _notificationsPlugin.show(
      id: id.hashCode, // Use hash of id to ensure uniqueness
      title: title,
      body: body,
      notificationDetails: platformChannelSpecifics,
    );
  }

  /// Cancel a specific notification by ID
  static Future<void> cancelNotification(int id) async {
    await _notificationsPlugin.cancel(id: id);
  }

  /// Cancel all notifications
  static Future<void> cancelAllNotifications() async {
    await _notificationsPlugin.cancelAll();
  }
}

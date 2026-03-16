import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'dart:convert' show jsonEncode, jsonDecode;
import 'firebase_options.dart';
import 'package:tss_leads/providers/auth_provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/screens/login_screen.dart';
import 'package:tss_leads/screens/lead_detail_screen.dart';
import 'package:tss_leads/services/api_service.dart';
import 'package:tss_leads/services/notification_service.dart';
import 'package:tss_leads/services/followup_polling_service.dart';
import 'package:tss_leads/theme/app_theme.dart';

// Global navigation key for handling notifications
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

// Handle background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('🔔 Handling FCM message in background: ${message.messageId}');
  print('📦 Background message data: ${message.data}');

  // Show notification for background messages
  if (message.notification != null) {
    // Extract lead_id from the message data (may be nested)
    String? leadId;
    try {
      if (message.data.containsKey('lead_id')) {
        leadId = message.data['lead_id'];
      } else if (message.data.containsKey('payload')) {
        final payloadStr = message.data['payload'];
        if (payloadStr is String) {
          final payloadData = jsonDecode(payloadStr);
          leadId = payloadData['lead_id'];
        }
      }
      print('🔍 Extracted leadId from background message: $leadId');
    } catch (e) {
      print('⚠️ Error extracting leadId in background: $e');
    }

    // Create a proper JSON payload
    String payloadString = jsonEncode({'lead_id': leadId ?? ''});
    print('📋 Background payload: $payloadString');

    await NotificationService.show(
      id: message.hashCode,
      title: message.notification!.title ?? 'Notification',
      body: message.notification!.body ?? '',
      payload: payloadString,
    );
    print('✅ Background notification displayed');
  } else {
    print('⚠️ No notification in background message');
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Initialize notification service with callback for handling taps
  await NotificationService.init(
    onNotificationTap: (payload) {
      print('📲 Local notification tapped, payload: $payload');
      if (payload != null && payload.isNotEmpty) {
        try {
          // Parse the payload JSON
          final Map<String, dynamic> data = jsonDecode(payload);
          final leadId = data['lead_id'] as String?;

          print('🔍 Parsed leadId: $leadId');
          print('🔍 Parsed data: $data');

          if (leadId != null && leadId.isNotEmpty) {
            print('🎯 Opening lead from local notification: $leadId');
            // Navigate using Material route
            navigatorKey.currentState?.push(
              MaterialPageRoute(
                builder: (context) => LeadDetailScreen(leadId: leadId),
              ),
            );
            print('✅ Navigation completed');
          } else {
            print('⚠️ No leadId in parsed data');
          }
        } catch (e) {
          print('❌ Failed to parse notification payload: $e');
        }
      } else {
        print('⚠️ Notification payload is null or empty');
      }
    },
  );

  // Setup Firebase Cloud Messaging
  FirebaseMessaging messaging = FirebaseMessaging.instance;

  // Request notification permissions
  try {
    NotificationSettings settings = await messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      provisional: false,
      criticalAlert: false,
      sound: true,
    );

    print(
      '📢 User notification permission status: ${settings.authorizationStatus}',
    );

    // Get and log device token for testing
    final token = await messaging.getToken();
    print('🔑 FCM Device Token: $token');

    // Register FCM token with backend if available
    // This will be updated with actual user ID after login in auth provider
    if (token != null) {
      // Store token for later registration with backend
      print('📱 FCM Token ready for backend registration');
    }
  } catch (e) {
    print('⚠️ Firebase messaging initialization error: $e');
    if (kIsWeb) {
      print(
        'ℹ️ Note: FCM on web requires a valid firebase-messaging-sw.js service worker',
      );
    }
  }

  // Handle foreground messages
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('🔔 Received foreground message: ${message.notification?.title}');
    print('� Message ID: ${message.messageId}');
    print('📦 Message data: ${message.data}');

    if (message.notification != null) {
      // Extract lead_id directly from the message data
      String? leadId;
      try {
        // The payload from FCM might be nested - check both direct and nested paths
        if (message.data.containsKey('lead_id')) {
          leadId = message.data['lead_id'];
        } else if (message.data.containsKey('payload')) {
          // Parse the nested payload string
          final payloadStr = message.data['payload'];
          if (payloadStr is String) {
            final payloadData = jsonDecode(payloadStr);
            leadId = payloadData['lead_id'];
          }
        }
        print('🔍 Extracted leadId from foreground message: $leadId');
      } catch (e) {
        print('⚠️ Error extracting leadId: $e');
      }

      // Create a simple payload with just the lead_id
      String payloadString = jsonEncode({'lead_id': leadId ?? ''});
      print('📋 Payload string for notification: $payloadString');

      NotificationService.show(
        id: message.hashCode,
        title: message.notification!.title ?? 'Notification',
        body: message.notification!.body ?? '',
        payload: payloadString,
      );
    }
  });

  // Handle background messages
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Handle notification tap - navigate to lead detail
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    print('🔔 User tapped FCM notification');
    print('📦 Full message data: ${message.data}');

    if (message.data.isNotEmpty) {
      // Extract lead_id from the message data (may be nested)
      String? leadId;
      try {
        if (message.data.containsKey('lead_id')) {
          leadId = message.data['lead_id'];
        } else if (message.data.containsKey('payload')) {
          final payloadStr = message.data['payload'];
          if (payloadStr is String) {
            final payloadData = jsonDecode(payloadStr);
            leadId = payloadData['lead_id'];
          }
        }
        print('🔍 Extracted leadId from FCM message: $leadId');
      } catch (e) {
        print('⚠️ Error extracting leadId from FCM: $e');
      }

      if (leadId != null && leadId.isNotEmpty) {
        print('🎯 Navigating to lead detail: $leadId');

        // Use Material route navigation
        navigatorKey.currentState?.push(
          MaterialPageRoute(
            builder: (context) => LeadDetailScreen(leadId: leadId!),
          ),
        );
        print('✅ Navigation pushed to lead detail');
      } else {
        print('⚠️ No leadId found in notification data');
      }
    } else {
      print('⚠️ Notification data is empty');
    }
  });

  // Check if app was launched by a notification
  final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
  if (initialMessage != null) {
    print('🚀 App launched from notification: ${initialMessage.data}');
    if (initialMessage.data.isNotEmpty) {
      final leadId = initialMessage.data['lead_id'];
      if (leadId != null && leadId.isNotEmpty) {
        print('🎯 Will navigate to lead on first build: $leadId');
      }
    }
  }

  // Initialize LeadsProvider
  final leadsProvider = LeadsProvider();
  await leadsProvider.initialize();

  // Start the followup polling service for reminder notifications
  FollowupPollingService().start();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: AppTheme.surface,
    ),
  );
  runApp(TSSLeadsApp(leadsProvider: leadsProvider));
}

class TSSLeadsApp extends StatelessWidget {
  final LeadsProvider leadsProvider;

  const TSSLeadsApp({super.key, required this.leadsProvider});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider<LeadsProvider>.value(value: leadsProvider),
      ],
      child: MaterialApp(
        title: 'TSS Leads',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        navigatorKey: navigatorKey,
        home: const LoginScreen(),
      ),
    );
  }
}

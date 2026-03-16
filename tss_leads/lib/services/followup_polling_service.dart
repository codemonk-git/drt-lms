import 'dart:async';
import 'package:tss_leads/services/api_service.dart';
import 'package:tss_leads/services/notification_service.dart';

/// Service that polls the backend for pending followups and shows notifications
/// This replaces client-side notification scheduling with server-side scheduling
class FollowupPollingService {
  static final FollowupPollingService _instance =
      FollowupPollingService._internal();

  Timer? _pollingTimer;
  final ApiService _apiService = ApiService();
  bool _isPolling = false;

  // Track which followups we've already notified about to avoid duplicates
  final Set<String> _notifiedFollowupIds = {};

  // Polling interval in minutes
  static const int _pollingIntervalMinutes = 5;

  // How many minutes ahead to check for followups
  static const int _lookAheadMinutes = 30;

  FollowupPollingService._internal();

  factory FollowupPollingService() {
    return _instance;
  }

  /// Start the polling service
  void start() {
    if (_isPolling) {
      print('⚠️ Polling service already running');
      return;
    }

    _isPolling = true;
    print(
      '🔄 Starting followup polling service (every $_pollingIntervalMinutes minutes)',
    );

    // Check if user is already logged in, if so poll immediately
    if (_apiService.userId != null) {
      print('✅ User already logged in, checking for pending followups now...');
      _checkForPendingFollowups();
    } else {
      print('⏳ Waiting for user login before polling...');
    }

    // Set up recurring polling every N minutes (user may not be logged in yet on first start)
    _pollingTimer = Timer.periodic(
      Duration(minutes: _pollingIntervalMinutes),
      (_) => _checkForPendingFollowups(),
    );
  }

  /// Stop the polling service
  void stop() {
    if (!_isPolling) {
      print('⚠️ Polling service not running');
      return;
    }

    _isPolling = false;
    _pollingTimer?.cancel();
    _pollingTimer = null;
    print('⏹️ Stopped followup polling service');
  }

  /// Manually trigger a polling check (useful for testing)
  Future<void> checkNow() async {
    print('📡 Manual polling check triggered');
    await _checkForPendingFollowups();
  }

  /// Check for pending followups and show notifications
  Future<void> _checkForPendingFollowups() async {
    try {
      print('🔍 Checking for pending followups...');

      final followups = await _apiService.getPendingSoonFollowups(
        minutes: _lookAheadMinutes,
      );

      if (followups.isEmpty) {
        return;
      }

      for (final followup in followups) {
        final followupId = followup['id'] as String?;
        if (followupId == null) continue;
        if (_notifiedFollowupIds.contains(followupId)) continue;

        // Mark as notified
        _notifiedFollowupIds.add(followupId);

        // Extract details for notification
        final followupType = followup['followup_type'] as String? ?? 'Followup';
        final leadName = followup['lead_name'] as String? ?? 'Lead';
        final notes = followup['notes'] as String?;
        final leadId = followup['id'] as String?;

        try {
          await NotificationService.showFollowupNotification(
            id: followupId.hashCode,
            followupType: followupType,
            leadName: leadName,
            notes: notes,
            leadId: leadId,
          );
        } catch (e) {
          // Silent fail
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  /// Clear the notification history (useful for testing)
  void clearNotificationHistory() {
    _notifiedFollowupIds.clear();
  }
}

import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:tss_leads/models/user.dart';
import 'package:tss_leads/models/team.dart';
import 'package:tss_leads/services/api_service.dart';
import 'package:tss_leads/services/followup_polling_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  User? _currentUser;
  Team? _currentUserTeam;
  String? _companyId;
  bool _isLoading = false;
  String? _error;

  // Getters
  User? get currentUser => _currentUser;
  Team? get currentUserTeam => _currentUserTeam;
  String? get companyId => _companyId;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Team Lead Specific Getters
  bool get userIsTeamLead => _currentUserTeam != null;
  List<String> get teamMemberUserIds => _currentUserTeam?.memberUserIds ?? [];

  /// Check if current user is the team lead of the given team
  bool isUserTeamLeadOf(Team? team) {
    if (team == null || _currentUser == null) return false;
    return team.teamLeadId == _currentUser!.id;
  }

  /// Check if current user can edit/delete leads (non-team-leads can)
  bool get canEditLeads => !userIsTeamLead;

  /// Check if current user can manage team members (team leads only)
  bool get canManageTeam => userIsTeamLead;

  /// Detect if user is a team lead and load their team
  /// This mirrors the Angular detectTeamLeadStatus() flow
  Future<void> detectTeamLeadStatus() async {
    if (_currentUser == null || _currentUser!.id.isEmpty) {
      return;
    }

    // Check if admin - admins see all leads normally
    if (_currentUser!.role.isAdmin) {
      return;
    }

    // For non-admin users, check if they're a team lead
    try {
      // Try to fetch user's team
      final team = await _apiService.getUserTeam(_currentUser!.id);

      if (team != null && team.teamLeadId == _currentUser!.id) {
        _currentUserTeam = team;
        notifyListeners();
      } else {
        _currentUserTeam = null;
        notifyListeners();
      }
    } catch (e) {
      _currentUserTeam = null;
      notifyListeners();
    }
  }

  /// Login with email and password
  Future<bool> login({required String email, required String password}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _apiService.login(email: email, password: password);

      // Get the current user (now that token is set in ApiService)
      _currentUser = await _apiService.getCurrentUser();

      // Extract company_id and user_id from the User object
      if (_currentUser != null && _currentUser!.companyId.isNotEmpty) {
        _companyId = _currentUser!.companyId;
        _apiService.setCompanyId(_companyId!);
        // Set user ID for multi-tenant API calls
        _apiService.setUserId(_currentUser!.id);

        // Register FCM token with backend for push notifications
        try {
          final fcmToken = await FirebaseMessaging.instance.getToken();
          if (fcmToken != null) {
            await _apiService.registerFCMToken(_currentUser!.id, fcmToken);
          }
        } catch (e) {
          // Silent fail - FCM registration is not critical
          print('⚠️ Failed to register FCM token: $e');
        }

        // Trigger polling check immediately after user login to check for pending followups
        try {
          FollowupPollingService().checkNow();
        } catch (e) {
          // Silent fail
        }
      }

      // CRITICAL: Detect if user is a team lead and load their team
      // This mirrors the Angular ngOnInit → detectTeamLeadStatus() flow
      await detectTeamLeadStatus();

      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Login failed: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Logout and clear user data
  Future<void> logout() async {
    _currentUser = null;
    _currentUserTeam = null;
    _companyId = null;
    _error = null;
    _apiService.clearToken();
    _apiService.clearCompanyId();
    _apiService.clearUserId();
    notifyListeners();
  }

  /// Refresh current user data
  Future<bool> refreshUserData() async {
    if (!isAuthenticated) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentUser = await _apiService.getCurrentUser();
      if (_currentUser != null) {
        _currentUserTeam = await _apiService.getUserTeam(_currentUser!.id);
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Set auth token (for restoring session)
  void setToken(String token) {
    _apiService.setToken(token);
  }

  /// Update current user
  void updateCurrentUser(User user) {
    _currentUser = user;
    notifyListeners();
  }

  /// Update current user team
  void updateCurrentUserTeam(Team? team) {
    _currentUserTeam = team;
    notifyListeners();
  }

  /// Clear error message
  void clearError() {
    _error = null;
    notifyListeners();
  }
}

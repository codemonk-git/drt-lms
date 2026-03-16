import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:tss_leads/models/user.dart';
import 'package:tss_leads/models/team.dart';
import 'package:tss_leads/models/lead.dart';
import 'package:tss_leads/models/note.dart';
import 'package:tss_leads/models/stage.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';
}

class ApiService {
  // Auto-detect API URL based on platform
  static String _getBaseUrl() {
    try {
      // For Android emulator, use 10.0.2.2 (special alias for host localhost)
      // For physical devices and iOS, use localhost
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8000/api';
      }
      return 'http://localhost:8000/api';
    } catch (e) {
      // Web platform doesn't support Platform check
      return 'http://localhost:8000/api';
    }
  }

  static final String baseUrl = _getBaseUrl();

  // Singleton instance
  static final ApiService _instance = ApiService._internal();

  String? _token;
  String? _companyId;
  String? _userId;

  // Private constructor for singleton
  ApiService._internal();

  // Factory constructor to return singleton instance
  factory ApiService() {
    return _instance;
  }

  /// Get Authorization and Company headers
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
    if (_companyId != null) 'x-company-id': _companyId!,
    if (_userId != null) 'x-user-id': _userId!,
  };

  /// Set the authentication token
  void setToken(String token) {
    _token = token;
  }

  /// Set the company ID
  void setCompanyId(String companyId) {
    _companyId = companyId;
  }

  /// Set the user ID
  void setUserId(String userId) {
    _userId = userId;
  }

  /// Get the user ID
  String? get userId => _userId;

  /// Get the company ID
  String? get companyId => _companyId;

  /// Clear the authentication token
  void clearToken() {
    _token = null;
  }

  /// Clear the company ID
  void clearCompanyId() {
    _companyId = null;
  }

  /// Clear the user ID
  void clearUserId() {
    _userId = null;
  }

  /// Login with email and password
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final uri = Uri.parse(
        '$baseUrl/auth/login',
      ).replace(queryParameters: {'email': email, 'password': password});

      final response = await http.post(uri, headers: _headers);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _token = data['access_token'] as String?;
        return data;
      } else if (response.statusCode == 401) {
        throw ApiException('Invalid email or password', statusCode: 401);
      } else {
        throw ApiException(
          'Login failed: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Login error: $e');
    }
  }

  /// Get current user information
  Future<User> getCurrentUser() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return User.fromJson(data);
      } else if (response.statusCode == 401) {
        throw ApiException('Unauthorized', statusCode: 401);
      } else {
        throw ApiException(
          'Failed to fetch user: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get current user error: $e');
    }
  }

  /// Register FCM device token for push notifications
  Future<void> registerFCMToken(String userId, String fcmToken) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/$userId/fcm-token'),
        headers: _headers,
        body: jsonEncode({'fcm_token': fcmToken}),
      );

      if (response.statusCode == 200) {
        print('✅ FCM token registered successfully');
      } else {
        print('⚠️ Failed to register FCM token: ${response.statusCode}');
      }
    } catch (e) {
      print('⚠️ Error registering FCM token: $e');
      // Don't throw - this is not critical
    }
  }

  /// Get user's team information
  Future<Team?> getUserTeam(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/teams/user/$userId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        final data = responseData['data'];

        // Handle null data (user has no team)
        if (data == null) {
          return null;
        }

        return Team.fromJson(data as Map<String, dynamic>);
      } else if (response.statusCode == 404) {
        return null; // User has no team
      } else {
        throw ApiException(
          'Failed to fetch team: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get user team error: $e');
    }
  }

  /// Get all teams (admin only)
  Future<List<Team>> getTeams() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/teams'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> data = body['data'] as List<dynamic>;
        return data
            .map((t) => Team.fromJson(t as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException(
          'Failed to fetch teams: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get teams error: $e');
    }
  }

  /// Get all leads
  Future<List<Lead>> getLeads({
    String? stage,
    String? assignedTo,
    String? search,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/leads').replace(
        queryParameters: {
          if (stage != null) 'stage': stage,
          if (assignedTo != null) 'assigned_to': assignedTo,
          if (search != null) 'search': search,
        },
      );

      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final Map<String, dynamic> json =
            jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> data = json['data'] as List<dynamic>;
        return data
            .map((l) => Lead.fromJson(l as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException(
          'Failed to fetch leads: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get leads error: $e');
    }
  }

  /// Get a single lead by ID
  Future<Lead> getLead(String leadId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/leads/$leadId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        final leadData = responseData['data'] as Map<String, dynamic>;
        print('📦 API Response for lead $leadId: ${leadData.keys.toList()}');
        print(
          '📦 Next Followup: ${leadData['next_followup'] != null ? "Yes" : "None"}',
        );
        return Lead.fromJson(leadData);
      } else if (response.statusCode == 404) {
        throw ApiException('Lead not found', statusCode: 404);
      } else {
        throw ApiException(
          'Failed to fetch lead: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get lead error: $e');
    }
  }

  /// Create a new lead
  Future<Lead> createLead(Map<String, dynamic> leadData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/leads'),
        headers: _headers,
        body: jsonEncode(leadData),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        final data = (body['data'] as Map<String, dynamic>?) ?? body;
        return Lead.fromJson(data);
      } else {
        throw ApiException(
          'Failed to create lead: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Create lead error: $e');
    }
  }

  /// Update a lead
  Future<Lead> updateLead(String leadId, Map<String, dynamic> updates) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/leads/$leadId'),
        headers: _headers,
        body: jsonEncode(updates),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return Lead.fromJson(data);
      } else if (response.statusCode == 403) {
        throw ApiException(
          'You do not have permission to edit this lead',
          statusCode: 403,
        );
      } else if (response.statusCode == 404) {
        throw ApiException('Lead not found', statusCode: 404);
      } else {
        throw ApiException(
          'Failed to update lead: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Update lead error: $e');
    }
  }

  /// Delete a lead
  Future<void> deleteLead(String leadId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/leads/$leadId'),
        headers: _headers,
      );

      if (response.statusCode == 204 || response.statusCode == 200) {
        return;
      } else if (response.statusCode == 403) {
        throw ApiException(
          'You do not have permission to delete this lead',
          statusCode: 403,
        );
      } else if (response.statusCode == 404) {
        throw ApiException('Lead not found', statusCode: 404);
      } else {
        throw ApiException(
          'Failed to delete lead: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Delete lead error: $e');
    }
  }

  /// Update lead stage
  Future<Lead> updateLeadStage(String leadId, String stage) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/leads/$leadId/stage'),
        headers: _headers,
        body: jsonEncode({'stage': stage}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return Lead.fromJson(data);
      } else {
        throw ApiException(
          'Failed to update stage: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Update stage error: $e');
    }
  }

  /// Update lead call status
  Future<Lead> updateLeadCallStatus(
    String leadId,
    String callStatus, {
    String? description,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final body = {
        'call_status': callStatus,
        if (description != null) 'description': description,
        if (metadata != null) 'metadata': metadata,
      };

      final response = await http.patch(
        Uri.parse('$baseUrl/leads/$leadId/call_status'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return Lead.fromJson(data);
      } else {
        throw ApiException(
          'Failed to update call status: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Update call status error: $e');
    }
  }

  /// Get lead notes
  Future<List<Note>> getLeadNotes(String leadId) async {
    try {
      final uri = Uri.parse('$baseUrl/leads/$leadId/notes');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> data = json['data'] as List<dynamic>? ?? [];
        return data
            .map((n) => Note.fromJson(n as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException(
          'Failed to fetch notes: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get notes error: $e');
    }
  }

  /// Fetch activities for a lead
  Future<List<Activity>> getLeadActivities(String leadId) async {
    try {
      final uri = Uri.parse('$baseUrl/leads/$leadId/activities?limit=500');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> data = json['data'] as List<dynamic>? ?? [];
        return data
            .map((a) => Activity.fromJson(a as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException(
          'Failed to fetch activities: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get activities error: $e');
    }
  }

  /// Add a note to a lead
  Future<Map<String, dynamic>> addLeadNote(
    String leadId,
    String noteContent,
  ) async {
    try {
      final uri = Uri.parse(
        '$baseUrl/leads/$leadId/notes',
      ).replace(queryParameters: {'note': noteContent});

      final response = await http.post(uri, headers: _headers);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw ApiException(
          'Failed to add note: ${response.statusCode} - ${response.body}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Add note error: $e');
    }
  }

  /// Log an activity (call logged, whatsapp sent, note added, etc)
  Future<void> logActivity({
    required String userId,
    required String activityType,
    required String entityType,
    required String entityId,
    String? description,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/activities'),
        headers: _headers,
        body: jsonEncode({
          'company_id': _companyId,
          'user_id': userId,
          'activity_type': activityType,
          'entity_type': entityType,
          'entity_id': entityId,
          'description': description,
          'metadata': metadata,
        }),
      );

      // Check response status
      if (response.statusCode != 200 && response.statusCode != 201) {
        print('Activity log failed: ${response.statusCode} - ${response.body}');
        throw ApiException(
          'Failed to log activity: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      print('Log activity error: $e');
      // Re-throw so caller knows it failed
      if (e is ApiException) rethrow;
      throw ApiException('Log activity error: $e');
    }
  }

  /// Get all stages for company
  Future<List<Stage>> getStages() async {
    try {
      final uri = Uri.parse('$baseUrl/stages');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> data = json['data'] as List<dynamic>? ?? [];
        final stages = data
            .map((s) => Stage.fromJson(s as Map<String, dynamic>))
            .toList();
        return stages;
      } else {
        throw ApiException(
          'Failed to fetch stages: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get stages error: $e');
    }
  }

  /// Get forms for a specific stage
  Future<List<StageForm>> getStageForms(String stageId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/stages/$stageId/forms'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> data = json['data'] as List<dynamic>? ?? [];
        return data
            .map((f) => StageForm.fromJson(f as Map<String, dynamic>))
            .toList();
      } else {
        throw ApiException(
          'Failed to fetch forms: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get forms error: $e');
    }
  }

  /// Get a full form with fields by form ID
  Future<FormModel> getForm(String formId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/forms/$formId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;

        // Extract the data object which contains form and fields
        final dataObject = json['data'] as Map<String, dynamic>;
        final formData = dataObject['form'] as Map<String, dynamic>;
        final fieldsData = (dataObject['fields'] as List<dynamic>?) ?? [];

        // Merge form and fields into single object for FormModel parsing
        final mergedData = {...formData, 'fields': fieldsData};

        return FormModel.fromJson(mergedData);
      } else {
        throw ApiException(
          'Failed to fetch form: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get form error: $e');
    }
  }

  /// Delete a note
  /// Update a note
  Future<Map<String, dynamic>> updateNote(
    String leadId,
    String noteId,
    String noteContent,
  ) async {
    try {
      final uri = Uri.parse(
        '$baseUrl/leads/$leadId/notes/$noteId',
      ).replace(queryParameters: {'note': noteContent});

      final response = await http.put(uri, headers: _headers);

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw ApiException(
          'Failed to update note: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Update note error: $e');
    }
  }

  Future<bool> deleteNote(String leadId, String noteId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/leads/$leadId/notes/$noteId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        throw ApiException(
          'Failed to delete note: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Delete note error: $e');
    }
  }

  /// Delete a followup
  Future<bool> deleteFollowup(String leadId, [String? followupId]) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/leads/$leadId/followup'),
        headers: _headers,
      );

      // 200 = successful deletion
      // 404 = followup already deleted (still a success for our purposes)
      if (response.statusCode == 200 || response.statusCode == 404) {
        return true;
      } else {
        throw ApiException(
          'Failed to delete followup: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Delete followup error: $e');
    }
  }

  /// Create a new followup (simple 2-field structure)
  Future<Map<String, dynamic>> createFollowup({
    required String leadId,
    required String type,
    required DateTime scheduledFor,
    String priority = 'medium',
    String? note,
    String? assignedToUserId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/leads/$leadId/followup'),
        headers: _headers,
        body: jsonEncode({
          'scheduled_for': scheduledFor.toIso8601String(),
          'notes': note ?? '',
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw ApiException(
          'Failed to create followup: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Create followup error: $e');
    }
  }

  /// Update followup status
  Future<Map<String, dynamic>> updateFollowupStatus(
    String leadId,
    String followupId,
    String status,
  ) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/leads/$leadId/followups/$followupId'),
        headers: _headers,
        body: jsonEncode({'status': status}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw ApiException(
          'Failed to update followup: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Update followup error: $e');
    }
  }

  /// Update lead status/stage
  Future<Lead> updateLeadStatus(String leadId, String newStatus) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/leads/$leadId'),
        headers: _headers,
        body: jsonEncode({'status': newStatus}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return Lead.fromJson(data);
      } else {
        throw ApiException(
          'Failed to update lead status: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Update lead status error: $e');
    }
  }

  /// Submit a form for a lead
  Future<Map<String, dynamic>> submitLeadForm({
    required String leadId,
    required String stageId,
    required String formId,
    required Map<String, dynamic> fields,
  }) async {
    try {
      final body = {'stage_id': stageId, 'form_id': formId, 'fields': fields};

      final response = await http.post(
        Uri.parse('$baseUrl/leads/$leadId/forms/submit'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw ApiException(
          'Failed to submit form: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Submit form error: $e');
    }
  }

  /// Get all followups for the company
  Future<List<Followup>> getAllFollowups() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/followups/company/$_companyId/all'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map && data['data'] is List) {
          return (data['data'] as List)
              .map((f) => Followup.fromJson(f as Map<String, dynamic>))
              .toList();
        }
        return [];
      } else {
        throw ApiException(
          'Failed to fetch followups: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get followups error: $e');
    }
  }

  /// Get stage history for a lead
  Future<List<Map<String, dynamic>>> getStageHistory(String leadId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/leads/$leadId/stage-history'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map && data['data'] is List) {
          return List<Map<String, dynamic>>.from(data['data'] as List);
        }
        return [];
      } else {
        throw ApiException(
          'Failed to fetch stage history: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Get stage history error: $e');
    }
  }

  /// Get pending followups for the current user within the next N minutes.
  /// Works entirely client-side by filtering leads that have a nextFollowupDateTime
  /// within the look-ahead window (or are overdue by up to 60 minutes).
  Future<List<Map<String, dynamic>>> getPendingSoonFollowups({
    int minutes = 30,
  }) async {
    if (_userId == null) {
      return [];
    }

    try {
      final leads = await getLeads();
      final now = DateTime.now();
      final windowEnd = now.add(Duration(minutes: minutes));
      // Also surface followups that just became overdue (within last 60 min)
      final overdueThreshold = now.subtract(const Duration(minutes: 60));

      final result = <Map<String, dynamic>>[];
      for (final lead in leads) {
        final dtStr = lead.nextFollowupDateTime;
        if (dtStr == null || dtStr.isEmpty) continue;

        DateTime scheduled;
        try {
          scheduled = DateTime.parse(dtStr).toLocal();
        } catch (_) {
          continue;
        }

        // Include if due within the look-ahead window or recently overdue
        if (scheduled.isAfter(overdueThreshold) &&
            scheduled.isBefore(windowEnd)) {
          result.add({
            'id': lead.id,
            'followup_type': 'followup',
            'lead_name': lead.name,
            'notes': lead.followupNotes,
            'scheduled_for': dtStr,
          });
        }
      }

      return result;
    } catch (e) {
      return [];
    }
  }
}

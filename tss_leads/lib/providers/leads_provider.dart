import 'package:flutter/material.dart';
import 'package:localstorage/localstorage.dart';
import 'package:tss_leads/models/lead.dart';
import 'package:tss_leads/models/stage.dart';
import 'package:tss_leads/models/user.dart';
import 'package:tss_leads/models/team.dart';
import 'package:tss_leads/services/api_service.dart';

enum ActivityFilter { all, today, yesterday, thisWeek, thisMonth, custom }

class LeadsProvider extends ChangeNotifier {
  final List<Lead> _allLeads = [];
  final List<Stage> _stages = [];
  final List<Team> _teams = [];
  final ApiService _apiService = ApiService();
  late LocalStorage _storage;

  // Notes cache: Map of leadId -> list of notes
  final Map<String, List<dynamic>> _notesCache = {};

  // Team members cache: Map of teamId -> list of {user, role}
  final Map<String, List<Map<String, dynamic>>> _teamMembersCache = {};

  // Current user context (should be set from AuthProvider)
  User? _currentUser;
  Team? _currentUserTeam;
  bool _isLoadingLeads = false;
  String? _leadsError;

  // Filter state
  String? selectedStageId; // null = All
  String? selectedCallStatus; // null = All
  String searchQuery = '';
  String? selectedAssignee;
  String? selectedSource;
  bool? selectedFollowup; // true = with followup, false = without
  String? filterCity;
  String? filterProject;
  String? filterCampaign;
  DateTimeRange? createdDateRange;
  DateTimeRange? contactedDateRange;
  ActivityFilter activityFilter = ActivityFilter.all;
  String _activeStatusGroup =
      'all'; // 'all' | 'active' | 'archived' | 'deleted'

  bool isFiltersExpanded = false;
  bool isTopSheetOpen = false;
  String get activeStatusGroup => _activeStatusGroup;

  // Selection state
  final Set<String> _selectedLeadIds = {};
  bool _isSelectionMode = false;

  // Navigation
  int sidebarIndex = 0;
  int bottomNavIndex = 0; // 0 = Leads, 1 = Followups

  // ── User Context Getters ────────────────────────────────────────────────────

  User? get currentUser => _currentUser;
  Team? get currentUserTeam => _currentUserTeam;

  /// Team lead is determined by having a team assigned (from AuthProvider),
  /// NOT by the user's role field. The user's role might be "user" even if they're a team lead.
  bool get userIsTeamLead => _currentUserTeam != null;
  List<String> get teamMemberUserIds => _currentUserTeam?.memberUserIds ?? [];
  bool get isLoadingLeads => _isLoadingLeads;
  String? get leadsError => _leadsError;

  /// Initialize team lead context from AuthProvider
  /// This should be called after user login in AuthProvider
  void initializeTeamLeadContext({
    required User? currentUser,
    required Team? currentUserTeam,
  }) {
    _currentUser = currentUser;
    _currentUserTeam = currentUserTeam;
    notifyListeners();
  }

  /// Set the current user context (should be called from AuthProvider)
  void setCurrentUser(User? user) {
    _currentUser = user;
    notifyListeners();
  }

  /// Set the current user's team (should be called from AuthProvider)
  void setCurrentUserTeam(Team? team) {
    _currentUserTeam = team;
    notifyListeners();
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  /// Get a single lead by ID from all leads (unfiltered)
  /// This ensures we always get the latest stage, even if filtered out by stage filter
  Lead? getLeadById(String leadId) {
    try {
      return _allLeads.firstWhere((l) => l.id == leadId);
    } catch (_) {
      return null;
    }
  }

  List<Lead> get filteredLeads {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return _allLeads.where((lead) {
      // ─────────────────────────────────────────────────────────────────────
      // TEAM LEAD FILTERING: Only show leads assigned to team members
      // This mirrors the Angular leads component Team Lead filtering logic
      // ─────────────────────────────────────────────────────────────────────
      if (userIsTeamLead && _currentUserTeam != null) {
        // Show leads assigned to:
        // 1. The team lead themselves
        // 2. Their team members
        final isTeamLeadLead = lead.assignedTo.userId == _currentUser!.id;
        final isTeamMemberLead = teamMemberUserIds.contains(
          lead.assignedTo.userId,
        );

        // If not assigned to team lead or team members, filter out
        if (!isTeamLeadLead && !isTeamMemberLead) {
          return false;
        }
      }

      // Pipeline stage filter
      if (selectedStageId != null && lead.stageId != selectedStageId)
        return false;

      // Call status filter
      if (selectedCallStatus != null && lead.callStatus != selectedCallStatus)
        return false;

      // Status group filter (active/archived/deleted)
      if (_activeStatusGroup != 'all') {
        if (_activeStatusGroup == 'active' && lead.status != LeadStatus.active)
          return false;
        if (_activeStatusGroup == 'archived' &&
            lead.status != LeadStatus.archived)
          return false;
        if (_activeStatusGroup == 'deleted' &&
            lead.status != LeadStatus.deleted)
          return false;
      }

      // Search
      if (searchQuery.isNotEmpty) {
        final q = searchQuery.toLowerCase();
        if (!lead.contact.name.toLowerCase().contains(q) &&
            !lead.contact.phone.contains(q) &&
            !(lead.contact.email?.toLowerCase().contains(q) ?? false))
          return false;
      }

      // Assignee
      if (selectedAssignee != null &&
          lead.assignedTo.userId != selectedAssignee)
        return false;

      // Source
      if (selectedSource != null && lead.source.platform != selectedSource)
        return false;

      // Followup
      if (selectedFollowup != null && lead.hasFollowup != selectedFollowup)
        return false;

      // City
      if (filterCity != null &&
          filterCity!.isNotEmpty &&
          !(lead.details.location?.toLowerCase().contains(
                filterCity!.toLowerCase(),
              ) ??
              false))
        return false;

      // Project
      if (filterProject != null &&
          filterProject!.isNotEmpty &&
          !lead.details.projectId.toLowerCase().contains(
            filterProject!.toLowerCase(),
          ))
        return false;

      // Campaign
      if (filterCampaign != null &&
          filterCampaign!.isNotEmpty &&
          !(lead.source.campaignId?.toLowerCase().contains(
                filterCampaign!.toLowerCase(),
              ) ??
              false))
        return false;

      // Created date range
      if (createdDateRange != null) {
        if (lead.createdAt.isBefore(createdDateRange!.start) ||
            lead.createdAt.isAfter(
              createdDateRange!.end.add(const Duration(days: 1)),
            ))
          return false;
      }

      // Last activity filter (as proxy for contacted range, or we can use activities)
      if (activityFilter != ActivityFilter.all) {
        switch (activityFilter) {
          case ActivityFilter.today:
            if (lead.updatedAt.isBefore(today)) return false;
          case ActivityFilter.yesterday:
            final yesterday = today.subtract(const Duration(days: 1));
            if (lead.updatedAt.isBefore(yesterday) ||
                !lead.updatedAt.isBefore(today))
              return false;
          case ActivityFilter.thisWeek:
            final weekStart = today.subtract(Duration(days: today.weekday - 1));
            if (lead.updatedAt.isBefore(weekStart)) return false;
          case ActivityFilter.thisMonth:
            final monthStart = DateTime(today.year, today.month, 1);
            if (lead.updatedAt.isBefore(monthStart)) return false;
          default:
            break;
        }
      }

      return true;
    }).toList();
  }

  int countForStageId(String? stageId) {
    return _allLeads.where((lead) {
      // Apply assignee filter if set
      if (selectedAssignee != null &&
          lead.assignedTo.userId != selectedAssignee) {
        return false;
      }

      if (stageId == null) return true;
      return lead.stageId == stageId;
    }).length;
  }

  /// Get assignee user IDs, filtered by team members if user is a team lead
  List<String> get assignees {
    final userIds = _allLeads.map((l) => l.assignedTo.userId).toSet().toList();

    // For team leads, only show team member IDs
    if (userIsTeamLead && _currentUserTeam != null) {
      return userIds
          .where(
            (id) => teamMemberUserIds.contains(id) || id == _currentUser?.id,
          )
          .toList()
        ..sort();
    }

    return userIds..sort();
  }

  /// Get assignee display names (user names) instead of IDs
  List<String> get assigneeNames {
    final uniqueIds = assignees.toSet();
    return uniqueIds.map((id) => getUserNameById(id) ?? id).toList()..sort();
  }

  /// Get user display name by ID
  String? getUserNameById(String userId) {
    // Check in team members first (for team leads)
    if (_currentUserTeam != null) {
      final member = _currentUserTeam!.members.firstWhere(
        (m) => m.userId == userId,
        orElse: () => TeamMember(userId: '', role: '', user: null),
      );
      if (member.userId.isNotEmpty) {
        return member.user?.name ?? member.user?.email ?? userId;
      }
    }

    // Check current user
    if (_currentUser?.id == userId) {
      return _currentUser?.name ?? _currentUser?.email;
    }

    // Check in all leads for assignee info
    try {
      final lead = _allLeads.firstWhere((l) => l.assignedTo.userId == userId);
      return lead.assignedTo.userId;
    } catch (_) {
      return null;
    }
  }

  /// Get user ID by display name (for filter lookup)
  String? getUserIdByName(String displayName) {
    // Check team members
    if (_currentUserTeam != null) {
      final member = _currentUserTeam!.members.firstWhere(
        (m) => (m.user?.name ?? '') == displayName,
        orElse: () => TeamMember(userId: '', role: '', user: null),
      );
      if (member.userId.isNotEmpty) return member.userId;
    }

    // Check current user
    if ((_currentUser?.name ?? '') == displayName) {
      return _currentUser?.id;
    }

    return null;
  }

  /// Set assignee by display name (for filter selection)
  void setAssigneeByName(String? displayName) {
    if (displayName == null || displayName == 'All') {
      setAssignee(null);
      return;
    }

    final userId = getUserIdByName(displayName);
    if (userId != null) {
      setAssignee(userId);
    }
  }

  List<String> get sources =>
      _allLeads.map((l) => l.source.platform).toSet().toList()..sort();

  List<Stage> get stages => _stages;

  List<Team> get teams => _teams;

  /// Get cached notes for a specific lead
  List<dynamic> getNotesForLead(String leadId) => _notesCache[leadId] ?? [];

  /// Update notes cache for a lead
  void setCacheNotesForLead(String leadId, List<dynamic> notes) {
    _notesCache[leadId] = notes;
    notifyListeners();
  }

  /// Initialize LocalStorage and load saved filters
  Future<void> initialize() async {
    _storage = LocalStorage('tss_leads_preferences');

    // Ensure storage is ready
    await _storage.ready;

    // Load saved stage filter
    final savedStageId = _storage.getItem('selectedStageId');
    if (savedStageId != null && savedStageId.isNotEmpty) {
      selectedStageId = savedStageId;
    }

    // Load saved call status filter
    final savedCallStatus = _storage.getItem('selectedCallStatus');
    if (savedCallStatus != null && savedCallStatus.isNotEmpty) {
      selectedCallStatus = savedCallStatus;
    }

    notifyListeners();
  }

  // ── Setters ─────────────────────────────────────────────────────────────────

  void setStageId(String? stageId) {
    selectedStageId = stageId;

    // Persist to LocalStorage
    if (stageId != null && stageId.isNotEmpty) {
      _storage.setItem('selectedStageId', stageId);
    } else {
      // Clear by setting to empty string
      _storage.setItem('selectedStageId', '');
    }

    notifyListeners();
  }

  void setSelectedCallStatus(String? callStatus) {
    selectedCallStatus = callStatus;

    // Persist to LocalStorage
    if (callStatus != null && callStatus.isNotEmpty) {
      _storage.setItem('selectedCallStatus', callStatus);
    } else {
      // Clear by setting to empty string
      _storage.setItem('selectedCallStatus', '');
    }

    notifyListeners();
  }

  void toggleFilters() {
    isFiltersExpanded = !isFiltersExpanded;
    notifyListeners();
  }

  void setTopSheetOpen(bool value) {
    isTopSheetOpen = value;
    notifyListeners();
  }

  void setSearch(String query) {
    searchQuery = query;
    notifyListeners();
  }

  void setAssignee(String? value) {
    selectedAssignee = value;
    notifyListeners();
  }

  void setSource(String? value) {
    selectedSource = value;
    notifyListeners();
  }

  void setFollowup(bool? value) {
    selectedFollowup = value;
    notifyListeners();
  }

  void setStatusGroup(String group) {
    _activeStatusGroup = group;
    notifyListeners();
  }

  void setCity(String? value) {
    filterCity = value;
    notifyListeners();
  }

  void setProject(String? value) {
    filterProject = value;
    notifyListeners();
  }

  void setCampaign(String? value) {
    filterCampaign = value;
    notifyListeners();
  }

  void setCreatedDateRange(DateTimeRange? range) {
    createdDateRange = range;
    notifyListeners();
  }

  void setContactedDateRange(DateTimeRange? range) {
    contactedDateRange = range;
    notifyListeners();
  }

  void setActivityFilter(ActivityFilter filter) {
    activityFilter = filter;
    notifyListeners();
  }

  void setSidebarIndex(int index) {
    sidebarIndex = index;
    notifyListeners();
  }

  void setBottomNavIndex(int index) {
    bottomNavIndex = index;
    notifyListeners();
  }

  bool get hasActiveMoreFilters =>
      _activeStatusGroup != 'all' ||
      filterCity != null ||
      filterProject != null ||
      filterCampaign != null ||
      createdDateRange != null ||
      activityFilter != ActivityFilter.all;

  void resetMoreFilters() {
    _activeStatusGroup = 'all';
    filterCity = null;
    filterProject = null;
    filterCampaign = null;
    createdDateRange = null;
    contactedDateRange = null;
    activityFilter = ActivityFilter.all;
    notifyListeners();
  }

  void addLead(Lead lead) {
    _allLeads.insert(0, lead);
    notifyListeners();
  }

  // ── Lead Management ─────────────────────────────────────────────────────────

  // Lead Management ─────────────────────────────────────────────────────────

  void updateLeadStage(String leadId, String newStageId) {
    final index = _allLeads.indexWhere((l) => l.id == leadId);
    if (index != -1) {
      final oldLead = _allLeads[index];
      final now = DateTime.now();

      // Create activity for stage change
      final activity = Activity(
        id: 'act_${now.millisecondsSinceEpoch}',
        type: 'stage_change',
        outcome: newStageId,
        note: 'Pipeline stage changed to $newStageId',
        createdAt: now,
      );

      _allLeads[index] = oldLead.copyWith(
        stageId: newStageId,
        updatedAt: now,
        activities: [activity, ...oldLead.activities],
      );
      notifyListeners();
    }
  }

  void assignLead(String leadId, String userId) {
    final index = _allLeads.indexWhere((l) => l.id == leadId);
    if (index != -1) {
      final oldLead = _allLeads[index];
      final now = DateTime.now();

      _allLeads[index] = oldLead.copyWith(
        assignedTo: oldLead.assignedTo.copyWith(
          userId: userId,
          assignedAt: now,
        ),
        updatedAt: now,
      );
      notifyListeners();
    }
  }

  void addActivity(String leadId, Activity activity) {
    final index = _allLeads.indexWhere((l) => l.id == leadId);
    if (index != -1) {
      final oldLead = _allLeads[index];
      _allLeads[index] = oldLead.copyWith(
        activities: [activity, ...oldLead.activities],
        updatedAt: DateTime.now(),
        attemptCount: (activity.type == 'call' || activity.type == 'whatsapp')
            ? oldLead.attemptCount + 1
            : oldLead.attemptCount,
      );
      notifyListeners();
    }
  }

  void addFollowup(String leadId, String dateTime, String notes) {
    final index = _allLeads.indexWhere((l) => l.id == leadId);
    if (index != -1) {
      final oldLead = _allLeads[index];
      _allLeads[index] = oldLead.copyWith(
        nextFollowupDateTime: dateTime,
        followupNotes: notes,
        updatedAt: DateTime.now(),
      );
      notifyListeners();
    }
  }

  void completeFollowup(String leadId) {
    final index = _allLeads.indexWhere((l) => l.id == leadId);
    if (index != -1) {
      final oldLead = _allLeads[index];
      _allLeads[index] = oldLead.copyWith(
        nextFollowupDateTime: null,
        followupNotes: null,
        updatedAt: DateTime.now(),
      );
      notifyListeners();
    }
  }

  /// Remove a followup from a lead immediately (optimistic update)
  /// This provides instant UI feedback without waiting for API response
  Future<void> removeFollowup(String leadId) async {
    // Optimistic update
    final index = _allLeads.indexWhere((l) => l.id == leadId);
    if (index != -1) {
      final oldLead = _allLeads[index];
      _allLeads[index] = oldLead.copyWith(
        nextFollowupDateTime: null,
        followupNotes: null,
        updatedAt: DateTime.now(),
      );
      notifyListeners();
    }
    // Persist to backend
    try {
      await _apiService.deleteFollowup(leadId);
    } catch (_) {
      // Revert on failure
      if (index != -1) {
        await loadLeads();
      }
    }
  }

  // ── API Methods ─────────────────────────────────────────────────────────────

  /// Load leads from the API
  /// This mirrors the Angular LeadsComponent.loadLeads() flow
  ///
  /// Logic:
  /// - Admins: Load all leads
  /// - Team Leads: Load all company leads, but filter client-side to show only team member leads
  /// - Regular Users: Load only their assigned leads + unassigned leads
  Future<void> loadLeads() async {
    _isLoadingLeads = true;
    _leadsError = null;
    notifyListeners();

    try {
      if (_currentUser == null || _currentUser!.id.isEmpty) {
        // Fallback: load all company leads if no user is set
        final leads = await _apiService.getLeads();
        _allLeads.clear();
        _allLeads.addAll(leads);
        _isLoadingLeads = false;
        _leadsError = null;
        notifyListeners();
        return;
      }

      // Check if admin - if so, load all leads, otherwise load all and filter client-side
      if (_currentUser!.role.isAdmin) {
        final leads = await _apiService.getLeads();
        _allLeads.clear();
        _allLeads.addAll(leads);
      } else if (userIsTeamLead) {
        // Team leads see all company leads but filter client-side to their team members
        final leads = await _apiService.getLeads();
        _allLeads.clear();
        _allLeads.addAll(leads);
      } else {
        // Regular users see their assigned leads + unassigned leads
        final leads = await _apiService.getLeads();
        // Filter to show: assigned-to-me + unassigned (company-wide pool)
        final filtered = leads.where((lead) {
          final isAssignedToMe = lead.assignedTo.userId == _currentUser!.id;
          final isUnassigned = lead.assignedTo.userId.isEmpty;
          return isAssignedToMe || isUnassigned;
        }).toList();

        _allLeads.clear();
        _allLeads.addAll(filtered);
      }

      _isLoadingLeads = false;
      _leadsError = null;
      notifyListeners();

      // Load followups for all leads in the background
      _preloadFollowupsForAllLeads();

      // Load notes for all leads in background
      _preloadNotesForAllLeads();
    } catch (e) {
      _isLoadingLeads = false;
      _leadsError = e.toString();
      notifyListeners();
    }
  }

  /// Preload notes for all leads in the background
  /// This ensures notes appear on tiles without requiring the detail screen to be opened
  void _preloadNotesForAllLeads() async {
    for (final lead in _allLeads) {
      try {
        final notes = await _apiService.getLeadNotes(lead.id);
        _notesCache[lead.id] = notes;
      } catch (e) {
        // Silently fail - notes will load when detail screen opens
      }
    }
    notifyListeners();
  }

  /// Preload followups for all leads from API response
  /// The API now returns next_followup directly in the Lead object,
  /// so we don't need to fetch all followups separately
  void _preloadFollowupsForAllLeads() async {
    print('📞 ✅ Followups already loaded from getLeads() API response');
    print(
      '   ${_allLeads.where((l) => l.nextFollowupDateTime != null).length}/${_allLeads.length} leads have next_followup',
    );
    // No need to call getAllFollowups() - the API already returned next_followup in each lead
    notifyListeners();
  }

  /// Load stages from API
  Future<void> loadStages() async {
    try {
      final stages = await _apiService.getStages();

      // Sort by order
      stages.sort((a, b) => a.order.compareTo(b.order));
      _stages.clear();
      _stages.addAll(stages);
      notifyListeners();
    } catch (e) {
      _leadsError = e.toString();
      notifyListeners();
    }
  }

  /// Update stages in provider (used when stages are refreshed elsewhere)
  void updateStages(List<Stage> stages) {
    // Sort by order
    stages.sort((a, b) => a.order.compareTo(b.order));
    _stages.clear();
    _stages.addAll(stages);
    notifyListeners();
  }

  /// Load teams from API
  Future<void> loadTeams() async {
    try {
      final teams = await _apiService.getTeams();
      _teams.clear();
      _teams.addAll(teams);
      notifyListeners();
    } catch (e) {
      _leadsError = e.toString();
      notifyListeners();
    }
  }

  /// Load team members for a specific team
  Future<void> loadTeamMembers(String teamId) async {
    try {
      // Get the team details first
      final team = _teams.firstWhere((t) => t.id == teamId);

      // The team members should now come populated from the API with user details
      // No need to fetch separately - they're already in the team.members
      final members = <Map<String, dynamic>>[];
      for (final member in team.members) {
        // member.user should already have the user details from the API
        members.add({'user': member.user, 'role': member.role});
      }

      _teamMembersCache[teamId] = members;
      notifyListeners();
    } catch (e) {
      _leadsError = e.toString();
      notifyListeners();
    }
  }

  /// Get cached team members for a team
  List<Map<String, dynamic>> getTeamMembers(String teamId) {
    return _teamMembersCache[teamId] ?? [];
  }

  /// Get member stats for a specific user
  Map<String, dynamic> getMemberStats(String userId) {
    // Filter leads assigned to this user
    final memberLeads = _allLeads.where((lead) {
      return lead.assignedTo.userId == userId;
    }).toList();

    // Calculate stage breakdown
    final Map<String, int> stageBreakdown = {};
    for (var lead in memberLeads) {
      stageBreakdown[lead.stageName] =
          (stageBreakdown[lead.stageName] ?? 0) + 1;
    }

    // Calculate call status breakdown
    final Map<String, int> callStatusBreakdown = {};
    for (var lead in memberLeads) {
      callStatusBreakdown[lead.callStatus] =
          (callStatusBreakdown[lead.callStatus] ?? 0) + 1;
    }

    // Calculate followup stats
    final now = DateTime.now();
    int todayCount = 0;
    int upcomingCount = 0;
    int overdueCount = 0;

    for (var lead in memberLeads) {
      if (lead.nextFollowupDateTime != null &&
          lead.nextFollowupDateTime!.isNotEmpty) {
        try {
          final followupDate = DateTime.parse(lead.nextFollowupDateTime!);
          final today = DateTime(now.year, now.month, now.day);
          final followupDay = DateTime(
            followupDate.year,
            followupDate.month,
            followupDate.day,
          );

          if (followupDay == today) {
            todayCount++;
          } else if (followupDay.isAfter(today)) {
            upcomingCount++;
          } else {
            overdueCount++;
          }
        } catch (e) {
          // Invalid date format, skip
        }
      }
    }

    return {
      'totalLeads': memberLeads.length,
      'stageBreakdown': stageBreakdown,
      'callStatusBreakdown': callStatusBreakdown,
      'followupStats': {
        'today': todayCount,
        'upcoming': upcomingCount,
        'overdue': overdueCount,
      },
    };
  }

  /// Delete a lead (with permission check)
  Future<bool> deleteLead(String leadId) async {
    try {
      await _apiService.deleteLead(leadId);
      _allLeads.removeWhere((l) => l.id == leadId);
      notifyListeners();
      return true;
    } catch (e) {
      _leadsError = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Update lead stage via API
  Future<bool> updateLeadStageViaAPI(String leadId, String stage) async {
    try {
      final updatedLead = await _apiService.updateLeadStage(leadId, stage);
      final index = _allLeads.indexWhere((l) => l.id == leadId);
      if (index != -1) {
        _allLeads[index] = updatedLead;
        notifyListeners();
      }
      return true;
    } catch (e) {
      _leadsError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateLeadCallStatusViaAPI(
    String leadId,
    String callStatus,
  ) async {
    try {
      final updatedLead = await _apiService.updateLeadCallStatus(
        leadId,
        callStatus,
      );
      final index = _allLeads.indexWhere((l) => l.id == leadId);
      if (index != -1) {
        _allLeads[index] = updatedLead;
        notifyListeners();
      }
      return true;
    } catch (e) {
      _leadsError = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Refresh a single lead from the API and update it in the list
  Future<void> refreshLeadFromApi(String leadId) async {
    try {
      final updatedLead = await _apiService.getLead(leadId);
      final index = _allLeads.indexWhere((l) => l.id == leadId);
      if (index != -1) {
        // Update existing lead
        _allLeads[index] = updatedLead;
      } else {
        // Lead not in list yet, add it
        _allLeads.add(updatedLead);
      }
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  // ── Selection Management ────────────────────────────────────────────────────

  bool get isSelectionMode => _isSelectionMode;
  Set<String> get selectedLeadIds => _selectedLeadIds;
  int get selectedLeadsCount => _selectedLeadIds.length;
  bool isLeadSelected(String leadId) => _selectedLeadIds.contains(leadId);

  void toggleLeadSelection(String leadId) {
    if (_selectedLeadIds.contains(leadId)) {
      _selectedLeadIds.remove(leadId);
      if (_selectedLeadIds.isEmpty) {
        _isSelectionMode = false;
      }
    } else {
      _isSelectionMode = true;
      _selectedLeadIds.add(leadId);
    }
    notifyListeners();
  }

  void selectAll() {
    _selectedLeadIds.addAll(filteredLeads.map((l) => l.id));
    _isSelectionMode = true;
    notifyListeners();
  }

  void deselectAll() {
    _selectedLeadIds.clear();
    _isSelectionMode = false;
    notifyListeners();
  }

  Future<void> bulkAssignToStage(String stageId) async {
    try {
      for (String leadId in _selectedLeadIds) {
        final lead = getLeadById(leadId);
        if (lead != null) {
          await _apiService.updateLead(lead.id, {'stage_id': stageId});
          // Update local state immediately
          updateLeadStage(leadId, stageId);
        }
      }
      deselectAll();
      // Refresh the leads to get the updated stage info
      await loadLeads();
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> bulkAssignToMember(String userId) async {
    try {
      for (String leadId in _selectedLeadIds) {
        final lead = getLeadById(leadId);
        if (lead != null) {
          await _apiService.updateLead(lead.id, {
            'assigned_to_user_id': userId,
            'assigned_at': DateTime.now().toIso8601String(),
            'assigned_by': _currentUser?.id ?? 'system',
          });
          // Update local state immediately
          assignLead(leadId, userId);
        }
      }
      deselectAll();
      // Refresh the leads to get the updated assignment info
      await loadLeads();
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> bulkDelete() async {
    try {
      for (String leadId in _selectedLeadIds) {
        await _apiService.deleteLead(leadId);
        _allLeads.removeWhere((l) => l.id == leadId);
      }
      deselectAll();
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
}

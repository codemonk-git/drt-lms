/**
 * Team Lead Service
 * 
 * This service handles the end-to-end flow for Team Lead initialization
 * and lead fetching, mirroring the Angular implementation:
 * 
 * Flow:
 * 1. Detect if user is a team lead
 * 2. Load team members if they are a TL
 * 3. Load all leads
 * 4. Filter leads based on role (admin → all, TL → team members only, user → assigned + unassigned)
 */

import 'package:tss_leads/models/user.dart';
import 'package:tss_leads/models/team.dart';
import 'package:tss_leads/models/lead.dart';
import 'package:tss_leads/services/api_service.dart';

class TeamLeadService {
  final ApiService _apiService = ApiService();

  /// Detect if user is a team lead and return their team if they are
  ///
  /// Returns:
  /// - Team object if user is a team lead
  /// - null if user is not a team lead or error occurred
  Future<Team?> detectTeamLeadStatus({required User user}) async {
    if (user.role.isAdmin) {
      return null;
    }

    try {
      // Fetch user's team
      final userTeam = await _apiService.getUserTeam(user.id);

      if (userTeam != null && userTeam.teamLeadId == user.id) {
        return userTeam;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Load leads based on user role
  ///
  /// Logic:
  /// - Admins: Load all leads
  /// - Team Leads: Load all company leads (filtered client-side)
  /// - Regular Users: Load assigned + unassigned leads
  Future<List<Lead>> loadLeadsForUser({
    required User user,
    Team? userTeam,
  }) async {
    try {
      final allLeads = await _apiService.getLeads();

      // Determine which leads to show based on role
      late final List<Lead> visibleLeads;

      if (user.role.isAdmin) {
        visibleLeads = allLeads;
      } else if (userTeam != null) {
        // Return all leads - filtering is done client-side in LeadsProvider
        visibleLeads = allLeads;
      } else {
        // Regular user - show only assigned + unassigned
        final teamMemberIds = <String>{};
        if (userTeam != null) {
          teamMemberIds.addAll(userTeam.memberUserIds);
        }

        visibleLeads = allLeads.where((lead) {
          final isAssignedToMe = lead.assignedTo.userId == user.id;
          final isUnassigned = lead.assignedTo.userId.isEmpty;
          return isAssignedToMe || isUnassigned;
        }).toList();
      }

      return visibleLeads;
    } catch (e) {
      rethrow;
    }
  }

  /// Complete team lead initialization flow
  ///
  /// This is the main entry point that handles the full flow:
  /// 1. Detect if user is a team lead
  /// 2. Load their team if they are
  /// 3. Load appropriate leads based on role
  ///
  /// Returns a map with:
  /// - user: The authenticated user
  /// - userTeam: The team (if user is a team lead)
  /// - leads: The appropriate leads for display
  Future<Map<String, dynamic>> initializeTeamLeadFlow({
    required User user,
  }) async {
    // Step 1: Detect team lead status
    final userTeam = await detectTeamLeadStatus(user: user);

    // Step 2: Load leads appropriate for user role
    final leads = await loadLeadsForUser(user: user, userTeam: userTeam);

    return {'user': user, 'userTeam': userTeam, 'leads': leads};
  }
}

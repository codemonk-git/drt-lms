import 'package:tss_leads/models/user.dart';

class TeamMember {
  final String userId;
  final String role; // e.g., 'member', 'lead'
  final User? user; // Optional populated user data

  const TeamMember({required this.userId, required this.role, this.user});

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      userId: (json['user_id'] ?? json['userId']) as String,
      role: json['role'] as String? ?? 'member',
      user: json['user'] != null
          ? User.fromJson(json['user'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'user_id': userId,
    'role': role,
    'user': user?.toJson(),
  };

  TeamMember copyWith({String? userId, String? role, User? user}) {
    return TeamMember(
      userId: userId ?? this.userId,
      role: role ?? this.role,
      user: user ?? this.user,
    );
  }
}

class Team {
  final String id;
  final String name;
  final String teamLeadId;
  final List<TeamMember> members;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Team({
    required this.id,
    required this.name,
    required this.teamLeadId,
    required this.members,
    required this.createdAt,
    this.updatedAt,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    final membersData = json['members'] as List<dynamic>? ?? [];
    return Team(
      id: json['id'] as String,
      name: json['name'] as String,
      teamLeadId: json['team_lead_id'] as String,
      members: membersData
          .map((m) => TeamMember.fromJson(m as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.parse(
        json['created_at'] as String? ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'team_lead_id': teamLeadId,
    'members': members.map((m) => m.toJson()).toList(),
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt?.toIso8601String(),
  };

  /// Check if a user is the team lead
  bool isUserTeamLead(String userId) => teamLeadId == userId;

  /// Get list of team member user IDs
  List<String> get memberUserIds => members.map((m) => m.userId).toList();

  /// Check if a user is a member of this team
  bool isMember(String userId) => members.any((m) => m.userId == userId);

  Team copyWith({
    String? id,
    String? name,
    String? teamLeadId,
    List<TeamMember>? members,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Team(
      id: id ?? this.id,
      name: name ?? this.name,
      teamLeadId: teamLeadId ?? this.teamLeadId,
      members: members ?? this.members,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

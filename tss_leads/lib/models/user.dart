enum UserRole {
  admin('admin'),
  user('user'),
  teamLead('team_lead');

  final String value;
  const UserRole(this.value);

  static UserRole fromString(String value) {
    return UserRole.values.firstWhere(
      (role) => role.value == value,
      orElse: () => UserRole.user,
    );
  }

  bool get isTeamLead => this == UserRole.teamLead;
  bool get isAdmin => this == UserRole.admin;
}

class User {
  final String id;
  final String name;
  final String email;
  final String companyId;
  final UserRole role;
  final String? avatar;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.companyId,
    required this.role,
    this.avatar,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? json['user_id'] as String? ?? '',
      name: json['name'] as String? ?? '${json['first_name'] ?? ''} ${json['last_name'] ?? ''}'.trim(),
      email: json['email'] as String? ?? '',
      companyId: json['company_id'] as String? ?? '',
      role: UserRole.fromString(json['role'] as String? ?? 'user'),
      avatar: json['avatar'] as String?,
      createdAt: DateTime.parse(
        json['created_at'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'company_id': companyId,
    'role': role.value,
    'avatar': avatar,
    'created_at': createdAt.toIso8601String(),
  };

  User copyWith({
    String? id,
    String? name,
    String? email,
    String? companyId,
    UserRole? role,
    String? avatar,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      companyId: companyId ?? this.companyId,
      role: role ?? this.role,
      avatar: avatar ?? this.avatar,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

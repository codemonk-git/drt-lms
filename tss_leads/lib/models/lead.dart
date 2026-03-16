import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

enum LeadStatus { active, archived, deleted }

/// Helper function to extract string value from backend enum objects
/// Backend may return enums as {_value_: "value", _name_: "NAME", ...}
/// This extracts the _value_ field, or returns the original if it's already a string
String _extractEnumValue(dynamic value, String defaultValue) {
  if (value == null) return defaultValue;
  if (value is String) return value;
  if (value is Map<String, dynamic>) {
    // Handle Python enum object: {_value_: "value", _name_: "NAME", ...}
    final extracted = (value['_value_'] as String?) ?? defaultValue;
    return extracted;
  }
  return defaultValue;
}

/// Helper function to parse datetime strings from backend
/// Handles format with space instead of T: "2026-02-07 18:00:00.660000+00:00"
/// Always converts UTC to local timezone for consistent display
DateTime parseDateTime(String? dateStr, {DateTime? defaultValue}) {
  if (dateStr == null) return defaultValue ?? DateTime.now();
  try {
    // Parse as UTC (backend always sends UTC) then convert to local
    return DateTime.parse(dateStr).toLocal();
  } catch (_) {
    try {
      // Handle backend format with space instead of T
      final formatted = dateStr.replaceFirst(' ', 'T');
      return DateTime.parse(formatted).toLocal();
    } catch (e) {
      print('⚠️ Failed to parse datetime: $dateStr - $e');
      return defaultValue ?? DateTime.now();
    }
  }
}

class LeadSource {
  final String platform;
  final String? campaignId;
  final String? adsetId;
  final String? adId;

  const LeadSource({
    required this.platform,
    this.campaignId,
    this.adsetId,
    this.adId,
  });

  LeadSource copyWith({
    String? platform,
    String? campaignId,
    String? adsetId,
    String? adId,
  }) {
    return LeadSource(
      platform: platform ?? this.platform,
      campaignId: campaignId ?? this.campaignId,
      adsetId: adsetId ?? this.adsetId,
      adId: adId ?? this.adId,
    );
  }

  IconData get platformIcon {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return Icons.facebook;
      case 'google':
        return Icons.g_mobiledata;
      case 'instagram':
        return Icons.camera_alt_outlined;
      default:
        return Icons.language;
    }
  }
}

class ContactInfo {
  final String name;
  final String phone;
  final String? email;

  const ContactInfo({required this.name, required this.phone, this.email});

  ContactInfo copyWith({String? name, String? phone, String? email}) {
    return ContactInfo(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
    );
  }
}

class LeadDetails {
  final String projectId;
  final String? budget;
  final String? location;
  final String? propertyType;
  final DateTime? lastContactedAt;
  final String? lastContactType;
  final Map<String, dynamic>? customFields;
  final int? score;
  final List<String>? tags;

  const LeadDetails({
    required this.projectId,
    this.budget,
    this.location,
    this.propertyType,
    this.lastContactedAt,
    this.lastContactType,
    this.customFields,
    this.score,
    this.tags,
  });

  LeadDetails copyWith({
    String? projectId,
    String? budget,
    String? location,
    String? propertyType,
    DateTime? lastContactedAt,
    String? lastContactType,
    Map<String, dynamic>? customFields,
    int? score,
    List<String>? tags,
  }) {
    return LeadDetails(
      projectId: projectId ?? this.projectId,
      budget: budget ?? this.budget,
      location: location ?? this.location,
      propertyType: propertyType ?? this.propertyType,
      lastContactedAt: lastContactedAt ?? this.lastContactedAt,
      lastContactType: lastContactType ?? this.lastContactType,
      customFields: customFields ?? this.customFields,
      score: score ?? this.score,
      tags: tags ?? this.tags,
    );
  }
}

class Assignment {
  final String userId;
  final String role;
  final DateTime? assignedAt;
  final String assignedBy;

  const Assignment({
    required this.userId,
    required this.role,
    this.assignedAt,
    required this.assignedBy,
  });

  Assignment copyWith({
    String? userId,
    String? role,
    DateTime? assignedAt,
    String? assignedBy,
  }) {
    return Assignment(
      userId: userId ?? this.userId,
      role: role ?? this.role,
      assignedAt: assignedAt ?? this.assignedAt,
      assignedBy: assignedBy ?? this.assignedBy,
    );
  }
}

class Followup {
  final DateTime? dateTime;
  final String? notes;

  const Followup({this.dateTime, this.notes});

  factory Followup.fromJson(Map<String, dynamic> json) {
    return Followup(
      dateTime: json['next_followup_date_time'] != null
          ? parseDateTime(json['next_followup_date_time'] as String?)
          : null,
      notes: json['followup_notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'next_followup_date_time': dateTime?.toIso8601String(),
    'followup_notes': notes,
  };

  Followup copyWith({DateTime? dateTime, String? notes}) {
    return Followup(
      dateTime: dateTime ?? this.dateTime,
      notes: notes ?? this.notes,
    );
  }

  bool get isPending => dateTime != null && dateTime!.isAfter(DateTime.now());
  bool get isOverdue => dateTime != null && dateTime!.isBefore(DateTime.now());
}

class Activity {
  final String id;
  final String type;
  final String? outcome;
  final String note;
  final DateTime createdAt;
  final String? userName;
  final Map<String, dynamic>? metadata;

  const Activity({
    required this.id,
    required this.type,
    this.outcome,
    required this.note,
    required this.createdAt,
    this.userName,
    this.metadata,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    final type =
        (json['activity_type'] as String?) ??
        (json['type'] as String?) ??
        'unknown';
    final note =
        (json['description'] as String?) ?? (json['note'] as String?) ?? '';

    return Activity(
      id: json['id'] as String,
      type: type,
      outcome: json['outcome'] as String?,
      note: note,
      createdAt: parseDateTime(json['created_at'] as String?),
      userName: json['user_name'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'outcome': outcome,
    'note': note,
    'created_at': createdAt.toIso8601String(),
  };
}

class Lead {
  final String id;
  final String accountId;
  final LeadSource source;
  final ContactInfo contact;
  final LeadDetails details;
  final String stageId;
  final String stageName; // Add stage name from API
  final String
  callStatus; // Call status (not_called, picked, busy, invalid, etc)
  final LeadStatus status;
  final Assignment assignedTo;
  final String? createdByUserId;
  final String? createdByUserName;
  final String? nextFollowupDateTime; // ISO format datetime string
  final String? followupNotes;
  final List<Activity> activities;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int attemptCount;

  const Lead({
    required this.id,
    required this.accountId,
    required this.source,
    required this.contact,
    required this.details,
    required this.stageId,
    this.stageName = 'Unknown',
    this.callStatus = 'not_called',
    this.status = LeadStatus.active,
    required this.assignedTo,
    this.createdByUserId,
    this.createdByUserName,
    this.nextFollowupDateTime,
    this.followupNotes,
    this.activities = const [],
    required this.createdAt,
    required this.updatedAt,
    this.attemptCount = 0,
  });

  factory Lead.fromJson(Map<String, dynamic> json) {
    try {
      return Lead(
        id: (json['id'] as String?) ?? 'unknown',
        accountId: json['account_id'] as String? ?? '',
        source: LeadSource(
          platform: _extractEnumValue(json['source'], 'other'),
          campaignId: json['campaign_id'] as String?,
        ),
        contact: ContactInfo(
          name: json['name'] as String? ?? '',
          phone: json['phone'] as String? ?? '',
          email: json['email'] as String?,
        ),
        details: LeadDetails(
          projectId: json['project_id'] as String? ?? '',
          budget: json['budget'] as String?,
          location: json['location'] as String?,
          propertyType: json['property_type'] as String?,
          lastContactedAt: json['last_contacted_at'] != null
              ? parseDateTime(json['last_contacted_at'] as String?)
              : null,
          lastContactType: json['last_contact_type'] as String?,
          customFields: json['custom_fields'] as Map<String, dynamic>?,
          score: json['score'] as int?,
          tags: (json['tags'] as List<dynamic>?)?.cast<String>(),
        ),
        stageId: json['stage_id'] as String? ?? json['stage'] as String? ?? '',
        stageName: _extractEnumValue(json['stage'], 'Unknown'),
        callStatus: _extractEnumValue(json['call_status'], 'not_called'),
        status: LeadStatus.values.firstWhere(
          (s) => s.name == (_extractEnumValue(json['status'], 'active')),
          orElse: () => LeadStatus.active,
        ),
        assignedTo: Assignment(
          userId:
              (json['assigned_to_user_id'] ?? json['assigned_to'] ?? '')
                  as String,
          role: json['assigned_role'] as String? ?? 'user',
          assignedAt: json['assigned_at'] != null
              ? parseDateTime(json['assigned_at'] as String?)
              : null,
          assignedBy: json['assigned_by'] as String? ?? '',
        ),
        createdByUserId: json['created_by_user_id'] as String?,
        createdByUserName: json['created_by_user_name'] as String?,
        nextFollowupDateTime: json['next_followup_date_time'] as String?,
        followupNotes: json['followup_notes'] as String?,
        activities: ((json['activities'] as List<dynamic>?) ?? [])
            .map((a) => Activity.fromJson(a as Map<String, dynamic>))
            .toList(),
        createdAt: parseDateTime(json['created_at'] as String?),
        updatedAt: parseDateTime(json['updated_at'] as String?),
        attemptCount: json['attempt_count'] as int? ?? 0,
      );
    } catch (e) {
      print('⚠️ Error parsing Lead from JSON: $e');
      print('⚠️ JSON data: $json');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'account_id': accountId,
    'name': contact.name,
    'email': contact.email,
    'phone': contact.phone,
    'source': source.platform,
    'campaign_id': source.campaignId,
    'project_id': details.projectId,
    'budget': details.budget,
    'location': details.location,
    'property_type': details.propertyType,
    'stage': stageName,
    'stage_id': stageId,
    'status': status.name,
    'assigned_to': assignedTo.userId,
    'assigned_role': assignedTo.role,
    'assigned_at': assignedTo.assignedAt?.toIso8601String(),
    'assigned_by': assignedTo.assignedBy,
    'created_by_user_id': createdByUserId,
    'created_by_user_name': createdByUserName,
    'next_followup_date_time': nextFollowupDateTime,
    'followup_notes': followupNotes,
    'activities': activities.map((a) => a.toJson()).toList(),
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt.toIso8601String(),
    'attempt_count': attemptCount,
  };

  Lead copyWith({
    String? id,
    String? accountId,
    LeadSource? source,
    ContactInfo? contact,
    LeadDetails? details,
    String? stageId,
    String? stageName,
    String? callStatus,
    LeadStatus? status,
    Assignment? assignedTo,
    String? createdByUserId,
    String? createdByUserName,
    String? nextFollowupDateTime,
    String? followupNotes,
    List<Activity>? activities,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? attemptCount,
  }) {
    return Lead(
      id: id ?? this.id,
      accountId: accountId ?? this.accountId,
      source: source ?? this.source,
      contact: contact ?? this.contact,
      details: details ?? this.details,
      stageId: stageId ?? this.stageId,
      stageName: stageName ?? this.stageName,
      callStatus: callStatus ?? this.callStatus,
      status: status ?? this.status,
      assignedTo: assignedTo ?? this.assignedTo,
      createdByUserId: createdByUserId ?? this.createdByUserId,
      createdByUserName: createdByUserName ?? this.createdByUserName,
      nextFollowupDateTime: nextFollowupDateTime ?? this.nextFollowupDateTime,
      followupNotes: followupNotes ?? this.followupNotes,
      activities: activities ?? this.activities,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      attemptCount: attemptCount ?? this.attemptCount,
    );
  }

  // Helper getters for backward compatibility where possible
  String get name => contact.name;
  String get phone => contact.phone;
  String get project => details.projectId;
  String get city => details.location ?? 'Unknown';

  bool get hasFollowup =>
      nextFollowupDateTime != null && nextFollowupDateTime!.isNotEmpty;

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  String get formattedCreatedAt => DateFormat('dd MMM yyyy').format(createdAt);
}

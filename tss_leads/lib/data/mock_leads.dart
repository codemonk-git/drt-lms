import 'package:tss_leads/models/lead.dart';

final List<Lead> mockLeads = [
  Lead(
    id: 'ld_20260227_8f3k29',
    accountId: 'acc_8842',
    source: const LeadSource(
      platform: 'facebook',
      campaignId: 'cmp_784512',
      adsetId: 'adset_99821',
      adId: 'ad_44521',
    ),
    contact: const ContactInfo(
      name: 'Rohit Sharma',
      phone: '+919876543210',
      email: 'rohit@example.com',
    ),
    details: const LeadDetails(projectId: 'proj_101', location: 'Gurgaon'),
    stageId: 'stage_3',
    status: LeadStatus.active,
    assignedTo: Assignment(
      userId: 'user_78421',
      role: 'team_member',
      assignedAt: DateTime(2026, 2, 27, 10, 20),
      assignedBy: 'user_admin_1',
    ),
    nextFollowupDateTime: DateTime.now()
        .subtract(const Duration(hours: 5))
        .toIso8601String(),
    followupNotes: 'OVERDUE: Initial consultation followup',
    activities: [
      Activity(
        id: 'act_001',
        type: 'call',
        outcome: 'Interested',
        note: 'Discussed budget and preferences',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
    ],
    createdAt: DateTime.now().subtract(const Duration(days: 2)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
    attemptCount: 1,
  ),
  Lead(
    id: 'ld_20260227_99x123',
    accountId: 'acc_8842',
    source: const LeadSource(platform: 'google', campaignId: 'cmp_112233'),
    contact: const ContactInfo(
      name: 'Ananya Patel',
      phone: '+919123456789',
      email: 'ananya@example.com',
    ),
    details: const LeadDetails(projectId: 'proj_102', location: 'Mumbai'),
    stageId: 'stage_2',
    status: LeadStatus.active,
    assignedTo: Assignment(
      userId: 'user_78422',
      role: 'team_member',
      assignedAt: DateTime.now().subtract(const Duration(days: 1)),
      assignedBy: 'user_admin_1',
    ),
    nextFollowupDateTime: DateTime.now()
        .add(const Duration(days: 1))
        .toIso8601String(),
    followupNotes: 'TOMORROW: Send brochure via WhatsApp',
    activities: [],
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
    updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    attemptCount: 0,
  ),
  Lead(
    id: 'ld_20260227_kk2941',
    accountId: 'acc_8842',
    source: const LeadSource(platform: 'website'),
    contact: const ContactInfo(name: 'Deepak Nair', phone: '+918765432109'),
    details: const LeadDetails(projectId: 'proj_101', location: 'Pune'),
    stageId: 'stage_1',
    status: LeadStatus.active,
    assignedTo: Assignment(
      userId: 'user_78421',
      role: 'team_member',
      assignedAt: DateTime.now(),
      assignedBy: 'user_admin_1',
    ),
    activities: [],
    createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
    updatedAt: DateTime.now().subtract(const Duration(minutes: 30)),
    attemptCount: 0,
  ),
];

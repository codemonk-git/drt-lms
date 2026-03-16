import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/theme/app_theme.dart';
import 'package:tss_leads/models/team.dart';
import 'package:tss_leads/models/user.dart';

class TeamsScreen extends StatefulWidget {
  const TeamsScreen({super.key});

  @override
  State<TeamsScreen> createState() => _TeamsScreenState();
}

class _TeamsScreenState extends State<TeamsScreen> {
  String? _selectedTeamId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTeams();
    });
  }

  Future<void> _loadTeams() async {
    final provider = context.read<LeadsProvider>();
    await provider.loadTeams();
  }

  Widget _buildMembersSection(Team team) {
    final provider = context.watch<LeadsProvider>();
    final members = provider.getTeamMembers(team.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 12, right: 12),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.primary.withOpacity(0.05),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
        ),
        child: members.isEmpty
            ? Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Center(
                  child: Text(
                    'No members',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.onSurfaceMuted,
                    ),
                  ),
                ),
              )
            : ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: members.length,
                separatorBuilder: (_, __) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Divider(
                    color: AppTheme.divider.withOpacity(0.3),
                    height: 0.5,
                  ),
                ),
                itemBuilder: (context, index) {
                  final memberData = members[index];
                  final user = memberData['user'] as User?;
                  final role = memberData['role'] as String? ?? 'member';

                  return GestureDetector(
                    onTap: user != null
                        ? () => _showMemberStatsModal(context, user)
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      child: Row(
                        children: [
                          // Avatar mini
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF818CF8), Color(0xFF06B6D4)],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Center(
                              child: Text(
                                user != null
                                    ? user.name.substring(0, 1).toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Name & Email
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  user?.name ?? 'Unknown',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.onSurface,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (user?.email != null)
                                  Text(
                                    user!.email,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: AppTheme.onSurfaceMuted,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Role badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: role == 'lead'
                                  ? AppTheme.primary.withOpacity(0.15)
                                  : AppTheme.onSurfaceMuted.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              role,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w500,
                                color: role == 'lead'
                                    ? AppTheme.primary
                                    : AppTheme.onSurfaceMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  void _showMemberStatsModal(BuildContext context, User user) {
    final provider = context.read<LeadsProvider>();
    final stats = provider.getMemberStats(user.id);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _MemberStatsModal(user: user, stats: stats),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();

    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: SafeArea(
        child: provider.teams.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.group_rounded,
                      size: 56,
                      color: AppTheme.onSurfaceMuted.withOpacity(0.3),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'No Teams',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.onSurface,
                      ),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                itemCount: provider.teams.length * 2,
                itemBuilder: (context, index) {
                  final teamIndex = index ~/ 2;
                  final isTeamRow = index % 2 == 0;

                  if (!isTeamRow) {
                    final team = provider.teams[teamIndex];
                    if (_selectedTeamId != team.id) {
                      return const SizedBox.shrink();
                    }
                    return _buildMembersSection(team);
                  }

                  final team = provider.teams[teamIndex];
                  final isSelected = _selectedTeamId == team.id;
                  final memberCount = team.members.length;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _selectedTeamId = isSelected ? null : team.id;
                          });
                          if (!isSelected) {
                            context.read<LeadsProvider>().loadTeamMembers(
                              team.id,
                            );
                          }
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isSelected
                                  ? AppTheme.primary
                                  : AppTheme.divider,
                              width: isSelected ? 1.5 : 1,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            color: isSelected
                                ? AppTheme.primary.withOpacity(0.06)
                                : Colors.transparent,
                          ),
                          child: Row(
                            children: [
                              // Avatar
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFF8B5CF6),
                                      Color(0xFF06B6D4),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    team.name.substring(0, 1).toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Team info
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      team.name,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurface,
                                      ),
                                    ),
                                    Text(
                                      '$memberCount member${memberCount != 1 ? 's' : ''}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                isSelected
                                    ? Icons.expand_less_rounded
                                    : Icons.expand_more_rounded,
                                color: isSelected
                                    ? AppTheme.primary
                                    : AppTheme.onSurfaceMuted,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _MemberStatsModal extends StatelessWidget {
  final User user;
  final Map<String, dynamic> stats;

  const _MemberStatsModal({required this.user, required this.stats});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 20, 16, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Center(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: AppTheme.primary,
                      child: Text(
                        user.name[0].toUpperCase(),
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      user.name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      user.email,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 24),

              // Total Leads
              Center(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Total Leads',
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                      ),
                      SizedBox(height: 4),
                      Text(
                        '${stats['totalLeads'] ?? 0}',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: 24),

              // Stages Section
              if ((stats['stageBreakdown'] as Map?)?.isNotEmpty ?? false) ...[
                Text(
                  'Stages',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: (stats['stageBreakdown'] as Map<String, int>)
                      .entries
                      .map(
                        (e) => Chip(
                          label: Text('${e.key}: ${e.value}'),
                          backgroundColor: AppTheme.primary.withOpacity(0.2),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            color: AppTheme.primary,
                          ),
                        ),
                      )
                      .toList(),
                ),
                SizedBox(height: 16),
              ],

              // Call Status Section
              if ((stats['callStatusBreakdown'] as Map?)?.isNotEmpty ??
                  false) ...[
                Text(
                  'Call Status',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: (stats['callStatusBreakdown'] as Map<String, int>)
                      .entries
                      .map(
                        (e) => Chip(
                          label: Text('${e.key}: ${e.value}'),
                          backgroundColor: Colors.orange.withOpacity(0.2),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            color: Colors.orange[800],
                          ),
                        ),
                      )
                      .toList(),
                ),
                SizedBox(height: 16),
              ],

              // Followups Section
              if (stats['followupStats'] != null) ...[
                Text(
                  'Followups',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(
                      label: Text(
                        'Today: ${stats['followupStats']['today'] ?? 0}',
                      ),
                      backgroundColor: Colors.blue.withOpacity(0.2),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        color: Colors.blue[800],
                      ),
                    ),
                    Chip(
                      label: Text(
                        'Upcoming: ${stats['followupStats']['upcoming'] ?? 0}',
                      ),
                      backgroundColor: Colors.green.withOpacity(0.2),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        color: Colors.green[800],
                      ),
                    ),
                    Chip(
                      label: Text(
                        'Overdue: ${stats['followupStats']['overdue'] ?? 0}',
                      ),
                      backgroundColor: Colors.red.withOpacity(0.2),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        color: Colors.red[800],
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

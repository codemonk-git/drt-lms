import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/providers/auth_provider.dart';
import 'package:tss_leads/theme/app_theme.dart';
import 'package:tss_leads/widgets/sidebar_shell.dart';
import 'package:tss_leads/widgets/status_tab_bar.dart';
import 'package:tss_leads/widgets/quick_filter_row.dart';
import 'package:tss_leads/widgets/more_filters_panel.dart';
import 'package:tss_leads/widgets/lead_tile.dart';
import 'package:tss_leads/screens/lead_detail_screen.dart';
import 'package:tss_leads/screens/new_lead_sheet.dart';
import 'package:tss_leads/screens/teams_screen.dart';
import 'package:tss_leads/services/notification_service.dart';
import 'package:tss_leads/services/followup_polling_service.dart';
import 'package:tss_leads/models/lead.dart';

class LeadsScreen extends StatelessWidget {
  const LeadsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SidebarShell(
      child: Scaffold(
        backgroundColor: AppTheme.surface,
        bottomNavigationBar: Stack(
          children: [
            _CustomBottomNavBar(),
            // Bulk action bar overlay
            Positioned(bottom: 0, left: 0, right: 0, child: _BulkActionBar()),
          ],
        ),
        body: SafeArea(
          child: Stack(
            children: [
              Column(
                children: [
                  _AppBar(),
                  Expanded(child: _LeadsBody()),
                ],
              ),
              // Top Sheet Overlay
              const _TopSheetFilter(),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomBottomNavBar extends StatelessWidget {
  const _CustomBottomNavBar();

  static const List<(IconData, String)> _items = [
    (Icons.people_alt_rounded, 'Leads'),
    (Icons.assignment_rounded, 'Tasks'),
    (Icons.home_work_rounded, 'Projects'),
    (Icons.trending_up_rounded, 'Insights'),
  ];

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    final currentIndex = provider.bottomNavIndex;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16, left: 20, right: 20),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.9),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.primary.withOpacity(0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(_items.length, (index) {
              final (icon, label) = _items[index];
              final isActive = index == currentIndex;

              return Expanded(
                child: GestureDetector(
                  onTap: () =>
                      context.read<LeadsProvider>().setBottomNavIndex(index),
                  child: Tooltip(
                    message: label,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOut,
                      padding: const EdgeInsets.symmetric(
                        vertical: 6,
                        horizontal: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppTheme.primary.withOpacity(0.1)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        icon,
                        size: isActive ? 20 : 18,
                        color: isActive
                            ? AppTheme.primary
                            : AppTheme.onSurfaceMuted.withOpacity(0.5),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _TopSheetFilter extends StatelessWidget {
  const _TopSheetFilter();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    final screenHeight = MediaQuery.of(context).size.height;
    final maxSheetHeight = screenHeight * 0.75; // Max 75% of screen height

    return AnimatedPositioned(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      top: provider.isTopSheetOpen ? 0 : -maxSheetHeight,
      left: 0,
      right: 0,
      child: IgnorePointer(
        ignoring: !provider.isTopSheetOpen,
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(
            bottom: Radius.circular(24),
          ),
          child: Material(
            elevation: provider.isTopSheetOpen ? 16 : 0,
            color: AppTheme.sidebarBg,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxSheetHeight),
              child: SingleChildScrollView(
                child: Container(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Advanced Filters',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.onSurface,
                            ),
                          ),
                          const Spacer(),
                          IconButton(
                            onPressed: () => provider.setTopSheetOpen(false),
                            icon: const Icon(
                              Icons.close_rounded,
                              color: AppTheme.onSurfaceMuted,
                              size: 20,
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Here we embed the content from MoreFiltersPanel
                      const MoreFiltersPanel(isInsideTopSheet: true),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                provider.resetMoreFilters();
                                provider.setTopSheetOpen(false);
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.onSurface,
                                side: const BorderSide(color: AppTheme.divider),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: const Text(
                                'Reset All',
                                style: TextStyle(fontSize: 13),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => provider.setTopSheetOpen(false),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                elevation: 0,
                              ),
                              child: const Text(
                                'Apply Filters',
                                style: TextStyle(fontSize: 13),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AppBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 12, 4),
      child: Column(
        children: [
          Row(
            children: [
              // Hamburger
              IconButton(
                icon: const Icon(
                  Icons.menu_rounded,
                  color: AppTheme.onSurface,
                  size: 22,
                ),
                onPressed: () => SidebarShellState.of(context)?.toggle(),
                padding: const EdgeInsets.all(8),
              ),
              // Title block
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getTitle(context.watch<LeadsProvider>().bottomNavIndex),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.onSurface,
                        letterSpacing: -0.4,
                      ),
                    ),
                  ],
                ),
              ),
              // Notification test button (Immediate)
              IconButton(
                icon: const Icon(
                  Icons.notifications_rounded,
                  color: AppTheme.primary,
                  size: 22,
                ),
                onPressed: () => NotificationService.showTestNotification(),
                tooltip: 'Immediate Test',
              ),
              // Polling check button (Check for pending followups)
              if (!kIsWeb)
                IconButton(
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppTheme.primary,
                    size: 22,
                  ),
                  onPressed: () async {
                    print('\ud83d\udce1 User triggered polling check');
                    await FollowupPollingService().checkNow();
                  },
                  tooltip: 'Check Notifications',
                ),
              // Notification test button (Delayed) - Android Only
              if (!kIsWeb)
                IconButton(
                  icon: const Icon(
                    Icons.timer_outlined,
                    color: AppTheme.primary,
                    size: 22,
                  ),
                  onPressed: () =>
                      NotificationService.showDelayedNotification(),
                  tooltip: 'Delayed (5s) Test',
                ),
              const SizedBox(width: 4),
              // Import button
              IconButton(
                icon: const Icon(Icons.upload_rounded, size: 18),
                color: AppTheme.onSurfaceMuted,
                onPressed: () {},
                tooltip: 'Import',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
              const SizedBox(width: 4),
              // New Lead button
              IconButton(
                icon: const Icon(Icons.add_rounded, size: 18),
                color: AppTheme.primary,
                onPressed: () => showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => ChangeNotifierProvider.value(
                    value: context.read<LeadsProvider>(),
                    child: const NewLeadSheet(),
                  ),
                ),
                tooltip: 'New Lead',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getTitle(int index) {
    switch (index) {
      case 1:
        return 'Followups';
      case 2:
        return 'Projects';
      case 3:
        return 'Insights';
      default:
        return 'Leads';
    }
  }
}

class _LeadsBody extends StatefulWidget {
  @override
  State<_LeadsBody> createState() => _LeadsBodyState();
}

class _LeadsBodyState extends State<_LeadsBody> {
  @override
  void initState() {
    super.initState();

    // Initialize team lead context and load leads
    // This mirrors the Angular ngOnInit → detectTeamLeadStatus() flow
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeTeamLeadContextAndLoadLeads();
    });
  }

  /// Initialize team lead context from AuthProvider and load leads
  /// This is the main entry point mirroring Angular's initialization flow
  Future<void> _initializeTeamLeadContextAndLoadLeads() async {
    final authProvider = context.read<AuthProvider>();
    final leadsProvider = context.read<LeadsProvider>();

    if (authProvider.currentUser == null) {
      return;
    }

    // Step 1: Initialize LeadsProvider with current user and team from AuthProvider
    leadsProvider.initializeTeamLeadContext(
      currentUser: authProvider.currentUser,
      currentUserTeam: authProvider.currentUserTeam,
    );

    // Step 2: Load leads (this will respect the team lead filtering)
    await leadsProvider.loadLeads();

    // Step 3: Load stages
    await leadsProvider.loadStages();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    final sidebarIndex = provider.sidebarIndex;
    final bottomNavIndex = provider.bottomNavIndex;

    // Sidebar navigation (higher priority)
    // 0 = Leads, 1 = Teams, 2 = Tasks, 3 = Reports, 4 = Settings
    if (sidebarIndex == 1) {
      // Teams screen
      return const TeamsScreen();
    }

    // For other sidebar items, show coming soon
    if (sidebarIndex != 0) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.construction_rounded,
              size: 64,
              color: AppTheme.onSurfaceMuted.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            const Text(
              'Coming Soon',
              style: TextStyle(color: AppTheme.onSurfaceMuted),
            ),
          ],
        ),
      );
    }

    // Leads section with bottom navigation
    if (bottomNavIndex == 1) {
      return _TasksView();
    }

    if (bottomNavIndex == 2) {
      return _ProjectsView();
    }

    if (bottomNavIndex >= 3) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.bar_chart_rounded,
              size: 64,
              color: AppTheme.onSurfaceMuted.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            const Text(
              'Insights Coming Soon',
              style: TextStyle(color: AppTheme.onSurfaceMuted),
            ),
          ],
        ),
      );
    }

    // Default: Show Leads list
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _SearchAndFilters()),
        SliverToBoxAdapter(child: _ResultsCountBar()),
        _LeadsList(),
      ],
    );
  }
}

class _SearchAndFilters extends StatefulWidget {
  @override
  State<_SearchAndFilters> createState() => _SearchAndFiltersState();
}

class _SearchAndFiltersState extends State<_SearchAndFilters> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.read<LeadsProvider>();
    return Column(
      children: [
        // Status tabs
        const SizedBox(height: 6),
        const StatusTabBar(),
        const SizedBox(height: 6),
        // Call status filters
        const Padding(
          padding: EdgeInsets.only(left: 16, right: 16, bottom: 6),
          child: _CallStatusFilterRow(),
        ),
        // Search bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by name, phone or email…',
              prefixIcon: const Icon(
                Icons.search_rounded,
                size: 16,
                color: AppTheme.onSurfaceMuted,
              ),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(24),
                borderSide: const BorderSide(
                  color: AppTheme.divider,
                  width: 0.5,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(24),
                borderSide: const BorderSide(
                  color: AppTheme.divider,
                  width: 0.5,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(24),
                borderSide: const BorderSide(color: AppTheme.primary, width: 1),
              ),
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (provider.searchQuery.isNotEmpty)
                    IconButton(
                      onPressed: () {
                        _searchController.clear();
                        provider.setSearch('');
                      },
                      icon: const Icon(
                        Icons.close_rounded,
                        size: 14,
                        color: AppTheme.onSurfaceMuted,
                      ),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        maxWidth: 32,
                        maxHeight: 32,
                      ),
                    ),
                  IconButton(
                    onPressed: () => provider.toggleFilters(),
                    icon: AnimatedRotation(
                      duration: const Duration(milliseconds: 250),
                      turns: provider.isFiltersExpanded ? 0.5 : 0,
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: AppTheme.onSurfaceMuted,
                      ),
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      maxWidth: 32,
                      maxHeight: 32,
                    ),
                  ),
                ],
              ),
            ),
            style: const TextStyle(fontSize: 12, color: AppTheme.onSurface),
            onChanged: provider.setSearch,
          ),
        ),
        // Collapsible dropdowns
        ClipRect(
          child: AnimatedAlign(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            heightFactor: provider.isFiltersExpanded ? 1.0 : 0.0,
            child: Column(
              children: [
                const SizedBox(height: 12),
                QuickFilterRow(onMoreTap: () => provider.setTopSheetOpen(true)),
                const SizedBox(height: 4),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
      ],
    );
  }
}

class _ResultsCountBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final leads = context.watch<LeadsProvider>().filteredLeads;
    final count = leads.length;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: AppTheme.surfaceVariant,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '$count leads match',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryDark,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '· $count leads',
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.onSurfaceMuted,
            ),
          ),
          const Spacer(),
          const Icon(
            Icons.select_all_rounded,
            size: 14,
            color: AppTheme.onSurfaceMuted,
          ),
        ],
      ),
    );
  }
}

class _LeadsList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final leads = context.watch<LeadsProvider>().filteredLeads;
    if (leads.isEmpty) {
      return SliverFillRemaining(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.search_off_rounded,
                size: 52,
                color: AppTheme.onSurfaceMuted.withOpacity(0.4),
              ),
              const SizedBox(height: 12),
              const Text(
                'No leads match your filters',
                style: TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => LeadTile(
          lead: leads[index],
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => LeadDetailScreen(leadId: leads[index].id),
            ),
          ),
        ),
        childCount: leads.length,
      ),
    );
  }
}

class _TasksView extends StatefulWidget {
  @override
  State<_TasksView> createState() => _TasksViewState();
}

class _TasksViewState extends State<_TasksView> {
  String _selectedFilter = 'all'; // all, today, upcoming, overdue

  /// Get leads with pending followups based on filter
  List<Lead> _getFilteredLeads(List<Lead> leads, String filterType) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekFromNow = today.add(const Duration(days: 7));

    return leads.where((lead) {
      // Must have a scheduled followup
      if (lead.nextFollowupDateTime == null ||
          lead.nextFollowupDateTime!.isEmpty) {
        return false;
      }

      try {
        final scheduledFor = parseDateTime(lead.nextFollowupDateTime!);
        final scheduledDate = DateTime(
          scheduledFor.year,
          scheduledFor.month,
          scheduledFor.day,
        );

        switch (filterType) {
          case 'today':
            return scheduledDate == today;
          case 'upcoming':
            return scheduledDate.isAfter(today) &&
                scheduledDate.isBefore(weekFromNow);
          case 'overdue':
            return scheduledDate.isBefore(today);
          case 'all':
          default:
            return true;
        }
      } catch (e) {
        return false;
      }
    }).toList();
  }

  /// Count followups by filter type
  int _countFollowups(List<Lead> leads, String filterType) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekFromNow = today.add(const Duration(days: 7));

    int count = 0;

    for (final lead in leads) {
      if (lead.nextFollowupDateTime == null ||
          lead.nextFollowupDateTime!.isEmpty) {
        continue;
      }

      try {
        final scheduledFor = parseDateTime(lead.nextFollowupDateTime!);
        final followupDate = DateTime(
          scheduledFor.year,
          scheduledFor.month,
          scheduledFor.day,
        );

        switch (filterType) {
          case 'today':
            if (followupDate == today) count++;
            break;
          case 'upcoming':
            if (followupDate.isAfter(today) &&
                followupDate.isBefore(weekFromNow)) {
              count++;
            }
            break;
          case 'overdue':
            if (followupDate.isBefore(today)) count++;
            break;
          case 'all':
            count++;
            break;
        }
      } catch (e) {
        // Invalid date format, skip
      }
    }

    return count;
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();

    // Always use provider.filteredLeads directly, then apply our own filter
    // This ensures we get fresh data on every rebuild
    final leads = _getFilteredLeads(provider.filteredLeads, _selectedFilter);

    return CustomScrollView(
      slivers: [
        // Filter chips
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'Today',
                        count: _countFollowups(provider.filteredLeads, 'today'),
                        isSelected: _selectedFilter == 'today',
                        onTap: () => setState(() => _selectedFilter = 'today'),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Upcoming',
                        count: _countFollowups(
                          provider.filteredLeads,
                          'upcoming',
                        ),
                        isSelected: _selectedFilter == 'upcoming',
                        onTap: () =>
                            setState(() => _selectedFilter = 'upcoming'),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Overdue',
                        count: _countFollowups(
                          provider.filteredLeads,
                          'overdue',
                        ),
                        isSelected: _selectedFilter == 'overdue',
                        onTap: () =>
                            setState(() => _selectedFilter = 'overdue'),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'All',
                        count: _countFollowups(provider.filteredLeads, 'all'),
                        isSelected: _selectedFilter == 'all',
                        onTap: () => setState(() => _selectedFilter = 'all'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        // Loading or empty state or leads list
        if (provider.isLoadingLeads)
          SliverFillRemaining(
            child: Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),
          )
        else if (leads.isEmpty)
          SliverFillRemaining(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.check_circle_rounded,
                    size: 64,
                    color: AppTheme.primary.withOpacity(0.2),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No leads available',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.onSurfaceMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate((context, index) {
              final lead = leads[index];

              return LeadTile(
                lead: lead,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChangeNotifierProvider.value(
                      value: context.read<LeadsProvider>(),
                      child: LeadDetailScreen(leadId: lead.id),
                    ),
                  ),
                ),
              );
            }, childCount: leads.length),
          ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primary
              : AppTheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? AppTheme.primary
                : AppTheme.primary.withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : AppTheme.primary,
              ),
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withOpacity(0.3)
                    : AppTheme.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : AppTheme.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProjectsView extends StatelessWidget {
  static const List<Map<String, dynamic>> _mockProjects = [
    {
      'id': '1',
      'name': 'Green Valley Estates',
      'type': 'Residential',
      'location': 'Gorai, Borivali West – Mumbai',
      'date': 'February 24, 2026',
      'possession': 'May 27, 2026',
      'rera': 'P52100077420',
      'furnishing': 'Furnished',
      'units': [
        {
          'type': '4BHK',
          'propertyType': 'Apartment',
          'saleable': '2000.00',
          'carpet': '1800.00',
          'count': 3,
        },
      ],
      'amenities': 'Parking, Security, CCTV',
      'area': '800',
      'rate': '200',
      'status': 'Available',
      'image':
          'https://via.placeholder.com/500x300/2E7D32/FFFFFF?text=Green+Valley+Estates',
      'commissionType': 'Flat',
      'commission': '5.00',
      'milestones': [
        {'condition': 'After Token', 'percentage': '5.00'},
        {'condition': 'On Booking', 'percentage': '10.00'},
        {'condition': 'On Possession', 'percentage': '85.00'},
      ],
    },
    {
      'id': '2',
      'name': 'SkyLine Estates',
      'type': 'Residential',
      'location': 'South Mumbai, Fort – Mumbai',
      'date': 'February 24, 2026',
      'possession': 'June 15, 2026',
      'rera': 'P52100077421',
      'furnishing': 'Semi-Furnished',
      'units': [
        {
          'type': '3BHK',
          'propertyType': 'Apartment',
          'saleable': '1600.00',
          'carpet': '1450.00',
          'count': 5,
        },
      ],
      'amenities': 'Gym, Pool, Garden, Security',
      'area': '600',
      'rate': '250',
      'status': 'Available',
      'image':
          'https://via.placeholder.com/500x300/1976D2/FFFFFF?text=SkyLine+Estates',
      'commissionType': 'Variable',
      'commission': '7.50',
      'milestones': [
        {'condition': 'After Token', 'percentage': '7.50'},
        {'condition': 'On Booking', 'percentage': '15.00'},
        {'condition': 'On Possession', 'percentage': '77.50'},
      ],
    },
  ];

  Map<String, List<Map<String, dynamic>>> _groupByStatus() {
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final project in _mockProjects) {
      final status = project['status'] as String;
      grouped.putIfAbsent(status, () => []).add(project);
    }
    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    final grouped = _groupByStatus();
    final statuses = grouped.keys.toList();

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: statuses.length * 2, // Section headers + project lists
      itemBuilder: (context, index) {
        final isHeader = index % 2 == 0;
        final statusIndex = index ~/ 2;
        final status = statuses[statusIndex];
        final projects = grouped[status]!;

        if (isHeader) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
            child: Row(
              children: [
                Text(
                  status,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.onSurface,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${projects.length}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return Column(
          children: projects.map((project) {
            return _CompactProjectCard(
              project: project,
              onTap: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                  ),
                  builder: (context) => _ProjectDetailView(project: project),
                );
              },
            );
          }).toList(),
        );
      },
    );
  }
}

class _CompactProjectCard extends StatelessWidget {
  final Map<String, dynamic> project;
  final VoidCallback onTap;

  const _CompactProjectCard({required this.project, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4CAF50), Color(0xFF66BB6A)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.home_work_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        project['name'],
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        project['location'],
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.onSurfaceMuted.withOpacity(0.7),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppTheme.primary,
                  size: 24,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProjectDetailView extends StatelessWidget {
  final Map<String, dynamic> project;

  const _ProjectDetailView({required this.project});

  /// Get gradient color based on project ID
  LinearGradient _getProjectGradient(String projectId) {
    const gradients = [
      LinearGradient(
        colors: [Color(0xFF2E7D32), Color(0xFF43A047)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      LinearGradient(
        colors: [Color(0xFF1976D2), Color(0xFF1E88E5)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    ];
    final index = int.parse(projectId) - 1;
    return gradients[index % gradients.length];
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle bar
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 12),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.onSurfaceMuted.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Content
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  project['name'],
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.onSurface,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  project['location'],
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.onSurfaceMuted.withOpacity(
                                      0.7,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    project['status'],
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.close_rounded,
                                color: AppTheme.onSurfaceMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Project Image
                      Container(
                        width: double.infinity,
                        height: 220,
                        decoration: BoxDecoration(
                          gradient: _getProjectGradient(project['id']),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Stack(
                          children: [
                            // Project Name as text overlay
                            Align(
                              alignment: Alignment.center,
                              child: Text(
                                project['name'],
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            // Commission Badge
                            Positioned(
                              top: 16,
                              right: 16,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.2),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Commission',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.onSurfaceMuted
                                            .withOpacity(0.7),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${project['commission']}%',
                                      style: TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      project['commissionType'],
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.onSurfaceMuted,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Key Details
                      Text(
                        'Project Details',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _DetailRow('Posted Date', project['date']),
                      _DetailRow('Possession Date', project['possession']),
                      _DetailRow('RERA Number', project['rera']),
                      _DetailRow('Furnishing', project['furnishing']),
                      const SizedBox(height: 16),

                      // Units
                      Text(
                        'Available Units',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: 1,
                                    child: Text(
                                      'Type',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      'Saleable',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 1,
                                    child: Text(
                                      'Count',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ...project['units'].map((unit) {
                              return Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      flex: 1,
                                      child: Text(
                                        unit['type'],
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 2,
                                      child: Text(
                                        '${unit['saleable']} Sq.Ft',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 1,
                                      child: Text(
                                        '${unit['count']}',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Property Details
                      Text(
                        'Property Information',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _DetailRow('Amenities', project['amenities']),
                      _DetailRow('Property Area (Sqft)', project['area']),
                      _DetailRow('Rate (₹/Sq.Ft)', project['rate']),
                      const SizedBox(height: 16),

                      // Payment Milestones
                      Text(
                        'Payment Milestones',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: 1,
                                    child: Text(
                                      '#',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      'Condition',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      'Percentage',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.onSurfaceMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Divider(
                              color: AppTheme.divider.withOpacity(0.2),
                              height: 1,
                              indent: 12,
                              endIndent: 12,
                            ),
                            ...(project['milestones'] as List)
                                .asMap()
                                .entries
                                .map((entry) {
                                  final idx = entry.key + 1;
                                  final milestone = entry.value;
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          flex: 1,
                                          child: Text(
                                            '$idx',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ),
                                        Expanded(
                                          flex: 3,
                                          child: Text(
                                            milestone['condition'],
                                            style: const TextStyle(
                                              fontSize: 11,
                                            ),
                                          ),
                                        ),
                                        Expanded(
                                          flex: 2,
                                          child: Text(
                                            '${milestone['percentage']}%',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                })
                                .toList(),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.onSurfaceMuted.withOpacity(0.7),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppTheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BulkActionBar extends StatelessWidget {
  const _BulkActionBar();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();

    if (!provider.isSelectionMode) {
      return SizedBox.shrink();
    }

    final selectedCount = provider.selectedLeadsCount;
    final totalCount = provider.filteredLeads.length;
    final allSelected = selectedCount == totalCount;

    return AnimatedSlide(
      offset: provider.isSelectionMode ? Offset.zero : const Offset(0, 1),
      duration: const Duration(milliseconds: 300),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppTheme.divider, width: 1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: [
            Checkbox(
              value: allSelected,
              onChanged: (_) {
                if (allSelected) {
                  provider.deselectAll();
                } else {
                  provider.selectAll();
                }
              },
              side: const BorderSide(color: AppTheme.primary, width: 1.5),
            ),
            const SizedBox(width: 8),
            Text(
              '$selectedCount selected',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppTheme.onSurface,
              ),
            ),
            const Spacer(),
            // Assign to Team Member button
            PopupMenuButton<String>(
              onSelected: (userId) {
                provider.bulkAssignToMember(userId);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('$selectedCount leads assigned'),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
              itemBuilder: (context) {
                final teamMemberIds = provider.teamMemberUserIds;
                final currentUserId = provider.currentUser?.id;

                // Build list of assignable members (team members + current user)
                final assignableIds = [
                  if (currentUserId != null) currentUserId,
                  ...teamMemberIds,
                ].toSet().toList();

                return assignableIds
                    .map(
                      (userId) => PopupMenuItem(
                        value: userId,
                        child: Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: const BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              provider.getUserNameById(userId) ?? userId,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.primary, width: 0.5),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.person_add_rounded,
                      size: 14,
                      color: AppTheme.primary,
                    ),
                    SizedBox(width: 4),
                    Text(
                      'Assign',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Close selection button
            IconButton(
              onPressed: () => provider.deselectAll(),
              icon: const Icon(
                Icons.close_rounded,
                size: 18,
                color: AppTheme.onSurfaceMuted,
              ),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ],
        ),
      ),
    );
  }
}

class _CallStatusFilterRow extends StatelessWidget {
  const _CallStatusFilterRow();

  static const List<String> callStatuses = [
    'not_called',
    'picked',
    'not_picked',
    'busy',
    'switched_off',
    'invalid',
  ];

  static const Map<String, IconData> statusIcons = {
    'not_called': Icons.phone_missed_rounded,
    'picked': Icons.call_received_rounded,
    'not_picked': Icons.call_made_rounded,
    'busy': Icons.schedule_rounded,
    'switched_off': Icons.phone_disabled_rounded,
    'invalid': Icons.error_outline_rounded,
  };

  static const Map<String, String> statusLabels = {
    'not_called': 'No Call',
    'picked': 'Picked',
    'not_picked': 'N Pick',
    'busy': 'Busy',
    'switched_off': 'Off',
    'invalid': 'Bad',
  };

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    return SizedBox(
      height: 28,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: callStatuses.length,
        itemBuilder: (context, index) {
          final status = callStatuses[index];
          final isSelected = provider.selectedCallStatus == status;
          return Padding(
            padding: EdgeInsets.only(
              right: index < callStatuses.length - 1 ? 4 : 0,
            ),
            child: Tooltip(
              message: statusLabels[status] ?? status,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    if (isSelected) {
                      provider.setSelectedCallStatus(null);
                    } else {
                      provider.setSelectedCallStatus(status);
                    }
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      color: isSelected
                          ? AppTheme.primary.withOpacity(0.2)
                          : AppTheme.surfaceVariant,
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : AppTheme.divider,
                        width: isSelected ? 1.5 : 0.5,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          statusIcons[status] ?? Icons.help_outline_rounded,
                          size: 12,
                          color: isSelected
                              ? AppTheme.primary
                              : AppTheme.onSurfaceMuted,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          statusLabels[status] ?? status,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.w500,
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.onSurfaceMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/theme/app_theme.dart';

class MoreFiltersPanel extends StatefulWidget {
  final bool isInsideTopSheet;
  const MoreFiltersPanel({super.key, this.isInsideTopSheet = false});

  @override
  State<MoreFiltersPanel> createState() => MoreFiltersPanelState();
}

class MoreFiltersPanelState extends State<MoreFiltersPanel>
    with SingleTickerProviderStateMixin {
  bool _expanded = false;
  late final AnimationController _chevronController;
  late final Animation<double> _chevronAngle;

  // Local ephemeral state for text fields
  final _cityController = TextEditingController();
  final _projectController = TextEditingController();
  final _campaignController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _chevronController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _chevronAngle = Tween<double>(begin: 0, end: 0.5).animate(
      CurvedAnimation(parent: _chevronController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _chevronController.dispose();
    _cityController.dispose();
    _projectController.dispose();
    _campaignController.dispose();
    super.dispose();
  }

  void toggle() {
    setState(() => _expanded = !_expanded);
    if (_expanded) {
      _chevronController.forward();
    } else {
      _chevronController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isInsideTopSheet) {
      return _MoreFiltersBody(
        cityController: _cityController,
        projectController: _projectController,
        campaignController: _campaignController,
        onClose: () {}, // Not needed in top sheet as we have external buttons
        isInsideTopSheet: true,
      );
    }

    final provider = context.watch<LeadsProvider>();
    return Column(
      children: [
        // Header row
        InkWell(
          onTap: toggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Icon(
                  Icons.filter_list_rounded,
                  size: 16,
                  color: provider.hasActiveMoreFilters
                      ? AppTheme.accent
                      : AppTheme.onSurfaceMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  'More Filters',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: provider.hasActiveMoreFilters
                        ? AppTheme.accent
                        : AppTheme.onSurfaceMuted,
                  ),
                ),
                if (provider.hasActiveMoreFilters) ...[
                  const SizedBox(width: 6),
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: AppTheme.accent,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
                const Spacer(),
                RotationTransition(
                  turns: _chevronAngle,
                  child: const Icon(
                    Icons.expand_more_rounded,
                    size: 18,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
        // Collapsible body
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          child: _expanded
              ? _MoreFiltersBody(
                  cityController: _cityController,
                  projectController: _projectController,
                  campaignController: _campaignController,
                  onClose: toggle,
                )
              : const SizedBox.shrink(),
        ),
        if (!_expanded) const Divider(height: 1),
      ],
    );
  }
}

class _MoreFiltersBody extends StatelessWidget {
  final TextEditingController cityController;
  final TextEditingController projectController;
  final TextEditingController campaignController;
  final VoidCallback onClose;
  final bool isInsideTopSheet;

  const _MoreFiltersBody({
    required this.cityController,
    required this.projectController,
    required this.campaignController,
    required this.onClose,
    this.isInsideTopSheet = false,
  });

  @override
  Widget build(BuildContext context) {
    final provider = context.read<LeadsProvider>();
    return Container(
      margin: EdgeInsets.only(bottom: isInsideTopSheet ? 0 : 4),
      padding: EdgeInsets.symmetric(
        horizontal: isInsideTopSheet ? 0 : 16,
        vertical: 12,
      ),
      decoration: BoxDecoration(
        color: isInsideTopSheet ? Colors.transparent : AppTheme.surfaceVariant,
        border: isInsideTopSheet
            ? null
            : Border(bottom: BorderSide(color: AppTheme.divider)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Lead Status
          _SectionLabel('Lead Status'),
          const SizedBox(height: 4),
          _StatusGroupSelector(),
          const SizedBox(height: 10),

          // Location
          _SectionLabel('Location'),
          const SizedBox(height: 4),
          TextField(
            controller: cityController,
            decoration: const InputDecoration(
              hintText: 'City, state or region…',
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            style: const TextStyle(fontSize: 12, color: AppTheme.onSurface),
            onChanged: provider.setCity,
          ),
          const SizedBox(height: 10),

          // Project
          _SectionLabel('Project'),
          const SizedBox(height: 4),
          TextField(
            controller: projectController,
            decoration: const InputDecoration(
              hintText: 'Project name…',
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            style: const TextStyle(fontSize: 12, color: AppTheme.onSurface),
            onChanged: provider.setProject,
          ),
          const SizedBox(height: 10),

          // Campaign
          _SectionLabel('Campaign'),
          const SizedBox(height: 4),
          TextField(
            controller: campaignController,
            decoration: const InputDecoration(
              hintText: 'Campaign name…',
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            style: const TextStyle(fontSize: 12, color: AppTheme.onSurface),
            onChanged: provider.setCampaign,
          ),
          const SizedBox(height: 10),

          // Created Date
          _SectionLabel('Created Date'),
          const SizedBox(height: 4),
          _DateRangePicker(
            range: context.watch<LeadsProvider>().createdDateRange,
            onChanged: provider.setCreatedDateRange,
          ),
          const SizedBox(height: 10),

          // Last Contacted
          _SectionLabel('Last Contacted'),
          const SizedBox(height: 4),
          _DateRangePicker(
            range: context.watch<LeadsProvider>().contactedDateRange,
            onChanged: provider.setContactedDateRange,
          ),
          const SizedBox(height: 10),

          // Recent Activity
          _SectionLabel('Recent Activity'),
          const SizedBox(height: 4),
          _ActivityFilterChips(),
          const SizedBox(height: 12),

          // Actions
          if (!isInsideTopSheet)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      provider.resetMoreFilters();
                      cityController.clear();
                      projectController.clear();
                      campaignController.clear();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.onSurfaceMuted,
                      side: const BorderSide(color: AppTheme.divider),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                    ),
                    child: const Text('Reset', style: TextStyle(fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onClose,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                    ),
                    child: const Text('Apply', style: TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: AppTheme.onSurfaceMuted,
        letterSpacing: 0.5,
      ),
    );
  }
}

class _StatusGroupSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    const options = [
      ('all', 'All'),
      ('active', 'Active'),
      ('won', 'Won'),
      ('lost', 'Lost'),
    ];
    return Wrap(
      spacing: 6,
      children: options.map((opt) {
        final isSelected = provider.activeStatusGroup == opt.$1;
        return GestureDetector(
          onTap: () => provider.setStatusGroup(opt.$1),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
            decoration: BoxDecoration(
              color: isSelected ? AppTheme.primary : AppTheme.cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? AppTheme.primary : AppTheme.divider,
              ),
            ),
            child: Text(
              opt.$2,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : AppTheme.onSurfaceMuted,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _DateRangePicker extends StatelessWidget {
  final DateTimeRange? range;
  final ValueChanged<DateTimeRange?> onChanged;

  const _DateRangePicker({required this.range, required this.onChanged});

  String _fmt(DateTime? d) {
    if (d == null) return 'dd/mm/yyyy';
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final picked = await showDateRangePicker(
          context: context,
          firstDate: DateTime(2020),
          lastDate: DateTime(2030),
          initialDateRange: range,
          builder: (context, child) => Theme(
            data: Theme.of(context).copyWith(
              colorScheme: Theme.of(
                context,
              ).colorScheme.copyWith(primary: AppTheme.primary),
            ),
            child: child!,
          ),
        );
        if (picked != null) onChanged(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.divider, width: 0.5),
        ),
        child: Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () async {
                  final picked = await showDateRangePicker(
                    context: context,
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2030),
                    initialDateRange: range,
                    builder: (context, child) => Theme(
                      data: Theme.of(context).copyWith(
                        colorScheme: Theme.of(
                          context,
                        ).colorScheme.copyWith(primary: AppTheme.primary),
                      ),
                      child: child!,
                    ),
                  );
                  if (picked != null) onChanged(picked);
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.calendar_today_rounded,
                      size: 14,
                      color: AppTheme.onSurfaceMuted,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        range == null
                            ? 'Select date range'
                            : '${_fmt(range?.start)} → ${_fmt(range?.end)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: range == null
                              ? AppTheme.onSurfaceMuted
                              : AppTheme.onSurface,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (range != null) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => onChanged(null),
                child: const Icon(
                  Icons.close_rounded,
                  size: 14,
                  color: AppTheme.onSurfaceMuted,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActivityFilterChips extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    const options = [
      (ActivityFilter.all, 'All'),
      (ActivityFilter.today, 'Today'),
      (ActivityFilter.yesterday, 'Yesterday'),
      (ActivityFilter.thisWeek, 'This Week'),
      (ActivityFilter.thisMonth, 'This Month'),
      (ActivityFilter.custom, 'Custom'),
    ];
    return Wrap(
      spacing: 5,
      runSpacing: 5,
      children: options.map((opt) {
        final isSelected = provider.activityFilter == opt.$1;
        return GestureDetector(
          onTap: () => provider.setActivityFilter(opt.$1),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppTheme.accent.withOpacity(0.15)
                  : AppTheme.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? AppTheme.accent : AppTheme.divider,
              ),
            ),
            child: Text(
              opt.$2,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppTheme.accent : AppTheme.onSurfaceMuted,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

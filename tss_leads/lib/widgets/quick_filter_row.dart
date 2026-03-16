import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/theme/app_theme.dart';

class QuickFilterRow extends StatelessWidget {
  final VoidCallback? onMoreTap;
  const QuickFilterRow({super.key, this.onMoreTap});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    return SizedBox(
      height: 30,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _FilterPill(
            label: provider.selectedAssignee == null
                ? 'All Assignees'
                : (provider.getUserNameById(provider.selectedAssignee!) ??
                      provider.selectedAssignee!),
            isActive: provider.selectedAssignee != null,
            onTap: () {
              final selectedId = provider.selectedAssignee;
              final selectedName = selectedId == null
                  ? 'All'
                  : (provider.getUserNameById(selectedId) ?? selectedId);
              _showPickerSheet(
                context,
                title: 'Assignee',
                options: ['All', ...provider.assigneeNames],
                selected: selectedName,
                onSelect: (v) =>
                    provider.setAssigneeByName(v == 'All' ? null : v),
              );
            },
          ),
          const SizedBox(width: 6),
          _FilterPill(
            label: provider.selectedFollowup == null
                ? 'All Followups'
                : provider.selectedFollowup!
                ? 'With Followup'
                : 'No Followup',
            isActive: provider.selectedFollowup != null,
            onTap: () => _showPickerSheet(
              context,
              title: 'Followup',
              options: ['All', 'With Followup', 'No Followup'],
              selected: provider.selectedFollowup == null
                  ? 'All'
                  : provider.selectedFollowup!
                  ? 'With Followup'
                  : 'No Followup',
              onSelect: (v) {
                if (v == 'All')
                  provider.setFollowup(null);
                else if (v == 'With Followup')
                  provider.setFollowup(true);
                else
                  provider.setFollowup(false);
              },
            ),
          ),
          const SizedBox(width: 6),
          _FilterPill(
            label: provider.selectedSource ?? 'All Platforms',
            isActive: provider.selectedSource != null,
            onTap: () => _showPickerSheet(
              context,
              title: 'Platform',
              options: ['All', ...provider.sources],
              selected: provider.selectedSource ?? 'All',
              onSelect: (v) => provider.setSource(v == 'All' ? null : v),
            ),
          ),
          const SizedBox(width: 6),
          _FilterPill(
            label: 'More',
            isActive: provider.hasActiveMoreFilters,
            icon: Icons.tune_rounded,
            showArrow: false,
            onTap: () => onMoreTap?.call(),
          ),
        ],
      ),
    );
  }

  void _showPickerSheet(
    BuildContext context, {
    required String title,
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelect,
  }) {
    showModalBottomSheet(
      context: context,
      builder: (_) => _PickerSheet(
        title: title,
        options: options,
        selected: selected,
        onSelect: onSelect,
      ),
    );
  }
}

class _FilterPill extends StatelessWidget {
  final String label;
  final bool isActive;
  final IconData? icon;
  final bool showArrow;
  final VoidCallback onTap;

  const _FilterPill({
    required this.label,
    required this.isActive,
    this.icon,
    this.showArrow = true,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: isActive
              ? AppTheme.primary.withOpacity(0.15)
              : AppTheme.surfaceVariant,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? AppTheme.primary : AppTheme.divider,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 11,
                color: isActive ? AppTheme.accent : AppTheme.onSurfaceMuted,
              ),
              const SizedBox(width: 3),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isActive ? AppTheme.accent : AppTheme.onSurfaceMuted,
              ),
            ),
            if (showArrow) ...[
              const SizedBox(width: 3),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 12,
                color: isActive ? AppTheme.accent : AppTheme.onSurfaceMuted,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PickerSheet extends StatelessWidget {
  final String title;
  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelect;

  const _PickerSheet({
    required this.title,
    required this.options,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.onSurface,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(
                    Icons.close_rounded,
                    color: AppTheme.onSurfaceMuted,
                  ),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: options.length,
                itemBuilder: (_, i) {
                  final opt = options[i];
                  final isSelected = opt == selected;
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 2,
                    ),
                    dense: true,
                    title: Text(
                      opt,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: isSelected
                            ? AppTheme.accent
                            : AppTheme.onSurface,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(
                            Icons.check_rounded,
                            color: AppTheme.accent,
                            size: 18,
                          )
                        : null,
                    onTap: () {
                      onSelect(opt);
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

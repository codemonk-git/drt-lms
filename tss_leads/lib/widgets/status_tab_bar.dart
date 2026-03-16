import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/theme/app_theme.dart';

class StatusTabBar extends StatelessWidget {
  const StatusTabBar({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    final stages = provider.stages;

    // Tabs: All, then all stages
    final tabs = [
      (null as String?, 'All'),
      ...stages.map((s) => (s.id, s.name) as (String?, String)),
    ];

    return SizedBox(
      height: 32,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 5),
        itemBuilder: (context, i) {
          final tab = tabs[i];
          final isActive = provider.selectedStageId == tab.$1;
          final count = provider.countForStageId(tab.$1);

          // Get color for stage tab
          Color tabColor = AppTheme.primary;
          if (tab.$1 != null && stages.isNotEmpty) {
            try {
              final stage = stages.firstWhere((s) => s.id == tab.$1);
              tabColor = Color(
                int.parse(stage.color.replaceFirst('#', '0xff')),
              );
            } catch (_) {
              tabColor = AppTheme.primary;
            }
          }

          return GestureDetector(
            onTap: () => provider.setStageId(tab.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isActive ? tabColor : AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isActive ? tabColor : AppTheme.divider,
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    tab.$2,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive ? Colors.white : AppTheme.onSurfaceMuted,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 0,
                    ),
                    decoration: BoxDecoration(
                      color: isActive
                          ? Colors.white.withOpacity(0.25)
                          : tabColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$count',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w700,
                        color: isActive ? Colors.white : tabColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

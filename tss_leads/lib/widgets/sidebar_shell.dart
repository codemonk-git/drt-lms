import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/providers/auth_provider.dart';
import 'package:tss_leads/theme/app_theme.dart';
import 'package:tss_leads/screens/login_screen.dart';

class SidebarShell extends StatefulWidget {
  final Widget child;
  const SidebarShell({super.key, required this.child});

  @override
  State<SidebarShell> createState() => SidebarShellState();
}

class SidebarShellState extends State<SidebarShell>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;
  bool _isOpen = false;

  static SidebarShellState? of(BuildContext context) =>
      context.findAncestorStateOfType<SidebarShellState>();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOutCubic,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void toggle() {
    setState(() => _isOpen = !_isOpen);
    if (_isOpen) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  void close() {
    if (_isOpen) toggle();
  }

  static const double _slideX = 80;
  static const double _slideY = 40;
  static const double _scaleFactor = 0.88;
  static const double _sidebarWidth = 80;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.sidebarBg,
      child: Stack(
        children: [
          // ── Sidebar ──────────────────────────────────────────────────────────
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: _sidebarWidth,
            child: _SidebarContent(onClose: close),
          ),

          // ── Main content ─────────────────────────────────────────────────────
          AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              final scale = 1.0 - ((1.0 - _scaleFactor) * _animation.value);
              return Transform.translate(
                offset: Offset(
                  _slideX * _animation.value,
                  _slideY * _animation.value,
                ),
                child: Transform.scale(
                  scale: scale,
                  alignment: Alignment.centerLeft,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(32 * _animation.value),
                    child: Stack(
                      children: [
                        child!,
                        // Scrim
                        if (_animation.value > 0)
                          Positioned.fill(
                            child: GestureDetector(
                              onTap: toggle,
                              child: Container(
                                color: Colors.black.withOpacity(
                                  0.4 * _animation.value,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
            child: widget.child,
          ),
        ],
      ),
    );
  }
}

class _SidebarContent extends StatelessWidget {
  final VoidCallback onClose;
  const _SidebarContent({required this.onClose});

  static const _navItems = [
    (Icons.people_alt_rounded, 'Leads'),
    (Icons.group_rounded, 'Teams'),
    (Icons.task_alt_rounded, 'Tasks'),
    (Icons.bar_chart_rounded, 'Reports'),
    (Icons.settings_rounded, 'Settings'),
  ];

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    return Column(
      children: [
        const SizedBox(height: 56),
        // Logo
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primary.withOpacity(0.2),
                blurRadius: 8,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
          ),
        ),
        const SizedBox(height: 40),

        // Nav items
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            itemCount: _navItems.length,
            itemBuilder: (context, index) {
              final item = _navItems[index];
              final isActive = provider.sidebarIndex == index;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () {
                    provider.setSidebarIndex(index);
                    onClose();
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppTheme.primary.withOpacity(0.15)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          item.$1,
                          size: 20,
                          color: isActive
                              ? AppTheme.primaryDark
                              : AppTheme.onSurfaceMuted.withOpacity(0.7),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.$2,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isActive
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: isActive
                                ? AppTheme.primaryDark
                                : AppTheme.onSurfaceMuted.withOpacity(0.7),
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        // User avatar and logout
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF8B5CF6), Color(0xFF06B6D4)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child: Text(
                    'PM',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              IconButton(
                icon: const Icon(
                  Icons.logout_rounded,
                  color: AppTheme.onSurfaceMuted,
                  size: 18,
                ),
                onPressed: () {
                  context.read<AuthProvider>().logout();
                  if (context.mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(
                        builder: (context) => const LoginScreen(),
                      ),
                      (route) => false,
                    );
                  }
                },
                tooltip: 'Logout',
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

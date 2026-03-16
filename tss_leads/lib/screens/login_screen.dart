import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/screens/leads_screen.dart';
import 'package:tss_leads/theme/app_theme.dart';
import 'package:tss_leads/providers/auth_provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'shailisharma@gmail.com');
  final _passCtrl = TextEditingController(text: 'admin123');
  bool _obscureText = true;
  bool _isLoading = false;

  void _handleLogin() async {
    final email = _emailCtrl.text.trim();
    final password = _passCtrl.text.trim();

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter email and password')),
      );
      return;
    }

    setState(() => _isLoading = true);

    if (!mounted) return;
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(email: email, password: password);

    if (!mounted) return;

    if (success) {
      // Update LeadsProvider with current user and team info
      final leadsProvider = context.read<LeadsProvider>();
      leadsProvider.setCurrentUser(authProvider.currentUser);
      leadsProvider.setCurrentUserTeam(authProvider.currentUserTeam);

      // Load leads for the user
      await leadsProvider.loadLeads();

      // Load stages
      await leadsProvider.loadStages();

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) =>
              const LeadsScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
          transitionDuration: const Duration(milliseconds: 600),
        ),
      );
    } else {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.error ?? 'Login failed')),
      );
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/logo.png',
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 32),

                // Welcome texts
                const Text(
                  'Welcome Back',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.onSurface,
                    letterSpacing: -0.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in to manage your leads',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.onSurfaceMuted,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),

                // Form fields
                const Text(
                  'Email',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.onSurface,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Enter your email',
                    prefixIcon: const Icon(
                      Icons.mail_outline_rounded,
                      size: 20,
                      color: AppTheme.onSurfaceMuted,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                const Text(
                  'Password',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _passCtrl,
                  obscureText: _obscureText,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.onSurface,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Enter your password',
                    prefixIcon: const Icon(
                      Icons.lock_outline_rounded,
                      size: 20,
                      color: AppTheme.onSurfaceMuted,
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureText
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 20,
                        color: AppTheme.onSurfaceMuted,
                      ),
                      onPressed: () {
                        setState(() => _obscureText = !_obscureText);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Forgot Password link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {},
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Forgot Password?',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Login Button
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    elevation: 2,
                    shadowColor: AppTheme.primary.withOpacity(0.3),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : const Text(
                          'Sign In',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                ),

                const SizedBox(height: 24),

                // Sign up prompt
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "Don't have an account?",
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.onSurfaceMuted,
                      ),
                    ),
                    TextButton(
                      onPressed: () {},
                      child: const Text(
                        'Sign Up',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
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
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/services/api_service.dart';
import 'package:tss_leads/theme/app_theme.dart';

class NewLeadSheet extends StatefulWidget {
  const NewLeadSheet({super.key});

  @override
  State<NewLeadSheet> createState() => _NewLeadSheetState();
}

class _NewLeadSheetState extends State<NewLeadSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _projectCtrl = TextEditingController();
  String _stageId = '';
  String _platform = 'facebook';
  bool _isSubmitting = false;

  final _platforms = [
    'facebook',
    'google',
    'instagram',
    'website',
    'referral',
    'walk-in',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _locationCtrl.dispose();
    _projectCtrl.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      final apiService = ApiService();
      final provider = context.read<LeadsProvider>();

      // Resolve stage
      final stages = provider.stages;
      final selectedStageId = _stageId.isEmpty
          ? (stages.isNotEmpty ? stages.first.id : null)
          : _stageId;

      final body = <String, dynamic>{
        'company_id': apiService.companyId ?? '',
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
        if (_locationCtrl.text.trim().isNotEmpty)
          'location': _locationCtrl.text.trim(),
        if (_projectCtrl.text.trim().isNotEmpty)
          'project': _projectCtrl.text.trim(),
        if (selectedStageId != null) 'stage_id': selectedStageId,
        'source': _platform,
        if (apiService.userId != null) 'created_by_user_id': apiService.userId!,
        if (apiService.userId != null)
          'assigned_to_user_id': apiService.userId!,
      };

      await apiService.createLead(body);
      await provider.loadLeads();

      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create lead: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.divider,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 12, 12),
              child: Row(
                children: [
                  const Text(
                    'New Lead',
                    style: TextStyle(
                      fontSize: 18,
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
                  ),
                ],
              ),
            ),
            // Form
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _FormField(
                        label: 'Full Name *',
                        controller: _nameCtrl,
                        hint: 'e.g. Rahul Sharma',
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Name is required' : null,
                      ),
                      const SizedBox(height: 14),
                      _FormField(
                        label: 'Phone *',
                        controller: _phoneCtrl,
                        hint: '+91 98765 43210',
                        keyboardType: TextInputType.phone,
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Phone is required' : null,
                      ),
                      const SizedBox(height: 14),
                      _FormField(
                        label: 'Email',
                        controller: _emailCtrl,
                        hint: 'email@example.com',
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 14),
                      _FormField(
                        label: 'Location',
                        controller: _locationCtrl,
                        hint: 'e.g. Mumbai',
                      ),
                      const SizedBox(height: 14),
                      _FormField(
                        label: 'Project ID',
                        controller: _projectCtrl,
                        hint: 'e.g. proj_101',
                      ),
                      const SizedBox(height: 14),
                      // Stage
                      const _FieldLabel('Pipeline Stage'),
                      const SizedBox(height: 6),
                      _StageSelector(
                        selectedStageId: _stageId,
                        onChanged: (stageId) =>
                            setState(() => _stageId = stageId),
                      ),
                      const SizedBox(height: 14),
                      // Platform
                      const _FieldLabel('Platform'),
                      const SizedBox(height: 6),
                      _DropdownField(
                        value: _platform,
                        items: _platforms,
                        onChanged: (v) => setState(() => _platform = v!),
                      ),
                      const SizedBox(height: 24),
                      // Submit
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isSubmitting ? null : _submit,
                          child: _isSubmitting
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Add Lead',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final FormFieldValidator<String>? validator;

  const _FormField({
    required this.label,
    required this.controller,
    required this.hint,
    this.keyboardType,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel(label),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          style: const TextStyle(fontSize: 13, color: AppTheme.onSurface),
          decoration: InputDecoration(hintText: hint),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppTheme.onSurfaceMuted,
      ),
    );
  }
}

class _DropdownField extends StatelessWidget {
  final String value;
  final List<String> items;
  final ValueChanged<String?> onChanged;

  const _DropdownField({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: value,
      items: items
          .map((e) => DropdownMenuItem(value: e, child: Text(e.toUpperCase())))
          .toList(),
      onChanged: onChanged,
      dropdownColor: AppTheme.cardBg,
      style: const TextStyle(fontSize: 13, color: AppTheme.onSurface),
      decoration: const InputDecoration(),
    );
  }
}

class _StageSelector extends StatelessWidget {
  final String selectedStageId;
  final ValueChanged<String> onChanged;

  const _StageSelector({
    required this.selectedStageId,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final stages = context.watch<LeadsProvider>().stages;

    if (stages.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariant,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
          'No stages available',
          style: TextStyle(fontSize: 12, color: AppTheme.onSurfaceMuted),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: stages.map((stage) {
          final isSelected = selectedStageId == stage.id;

          Color stageColor;
          try {
            stageColor = Color(
              int.parse(stage.color.replaceFirst('#', '0xff')),
            );
          } catch (_) {
            stageColor = AppTheme.primary;
          }

          return GestureDetector(
            onTap: () => onChanged(stage.id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: isSelected ? stageColor : stageColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: stageColor.withOpacity(isSelected ? 1 : 0.3),
                ),
              ),
              child: Text(
                stage.name,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : stageColor,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

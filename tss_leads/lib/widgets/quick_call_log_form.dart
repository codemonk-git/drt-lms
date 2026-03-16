import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/lead.dart';
import '../providers/leads_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'quick_followup_form.dart';
import 'add_note_dialog.dart';

class QuickCallLogForm extends StatefulWidget {
  final Lead lead;

  const QuickCallLogForm({required this.lead, Key? key}) : super(key: key);

  @override
  State<QuickCallLogForm> createState() => _QuickCallLogFormState();
}

class _QuickCallLogFormState extends State<QuickCallLogForm> {
  String? _selectedStatus;
  String? _selectedStage;
  late TextEditingController _noteController;

  static const List<String> callStatuses = [
    'picked',
    'not_picked',
    'busy',
    'switched_off',
    'invalid',
  ];

  static const Map<String, String> statusLabels = {
    'picked': 'Picked',
    'not_picked': 'Not Picked',
    'busy': 'Busy/Callback',
    'switched_off': 'Switched Off',
    'invalid': 'Invalid',
  };

  static const Map<String, IconData> statusIcons = {
    'picked': Icons.call_received_rounded,
    'not_picked': Icons.call_made_rounded,
    'busy': Icons.schedule_rounded,
    'switched_off': Icons.phone_disabled_rounded,
    'invalid': Icons.error_outline_rounded,
  };

  static const List<String> commonNotes = [
    'Interested',
    'Not interested',
    'Follow up later',
    'Wrong person',
    'Busy',
  ];

  @override
  void initState() {
    super.initState();
    _noteController = TextEditingController();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  bool _isFormValid() {
    return _selectedStatus != null && _noteController.text.trim().isNotEmpty;
  }

  void _showFollowupSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => QuickFollowupForm(leadId: widget.lead.id),
    );
  }

  void _showNoteDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AddNoteDialog(
        onSave: (note) async {
          print('📝 Note dialog saved: $note');

          try {
            // Save the note to the backend (this will appear in Lead Detail Notes section)
            final apiService = ApiService();
            await apiService.addLeadNote(widget.lead.id, note);
            print('✅ Note saved to backend');

            // Close the dialog
            Navigator.pop(dialogContext);

            // Show success message
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Note added to lead')),
              );
            }
          } catch (e) {
            print('❌ Error saving note: $e');
            Navigator.pop(dialogContext);
            if (mounted) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text('Error saving note: $e')));
            }
          }
        },
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (_selectedStatus == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a call status')),
      );
      return;
    }

    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please add notes')));
      return;
    }

    try {
      final apiService = ApiService();
      final provider = context.read<LeadsProvider>();

      // Build description with notes
      final description = noteText.isNotEmpty
          ? '$noteText (Status: ${_selectedStatus == 'picked' ? 'picked' : _selectedStatus})'
          : 'Call ${_selectedStatus == 'picked' ? 'answered' : _selectedStatus}';

      // Build metadata
      final metadata = {
        'phone': widget.lead.contact.phone,
        'call_status': _selectedStatus,
        'notes': noteText,
        'stage_moved': _selectedStage != null ? 'true' : 'false',
      };

      print('About to update call status with:');
      print('  status: $_selectedStatus');
      print('  description: $description');
      print('  notes: $noteText');

      // Update the lead's call status (this will log the activity with description + metadata)
      await apiService.updateLeadCallStatus(
        widget.lead.id,
        _selectedStatus!,
        description: description,
        metadata: metadata,
      );

      // Move to stage if selected
      if (_selectedStage != null) {
        await apiService.updateLeadStage(widget.lead.id, _selectedStage!);
      }

      // Refresh the lead in provider
      await provider.refreshLeadFromApi(widget.lead.id);

      if (mounted) {
        Navigator.pop(context);
        final message = <String>[];
        message.add('Status changed');
        if (_selectedStage != null) {
          message.add('stage updated');
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message.join(' & ')),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LeadsProvider>(
      builder: (context, provider, _) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Log Call',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Note icon button
                        Tooltip(
                          message: 'Add note',
                          child: IconButton(
                            onPressed: _showNoteDialog,
                            icon: Icon(
                              Icons.note_add_rounded,
                              size: 20,
                              color: AppTheme.primary,
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 32,
                              minHeight: 32,
                            ),
                          ),
                        ),
                        // Followup icon button
                        Tooltip(
                          message: 'Schedule followup',
                          child: IconButton(
                            onPressed: () {
                              _showFollowupSheet();
                            },
                            icon: Icon(
                              Icons.schedule_rounded,
                              size: 20,
                              color: AppTheme.primary,
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 32,
                              minHeight: 32,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Call status section
                const Text(
                  'Call Status',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: callStatuses.map((status) {
                    final isSelected = _selectedStatus == status;
                    return FilterChip(
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            statusIcons[status],
                            size: 14,
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.onSurfaceMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(statusLabels[status] ?? status),
                        ],
                      ),
                      selected: isSelected,
                      showCheckmark: false,
                      onSelected: (selected) {
                        setState(() {
                          _selectedStatus = selected ? status : null;
                        });
                      },
                      backgroundColor: AppTheme.surfaceVariant,
                      selectedColor: AppTheme.primary.withOpacity(0.2),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primary : AppTheme.divider,
                        width: isSelected ? 1.5 : 0.5,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                // Notes section
                const Text(
                  'Notes',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 8),
                // Common note chips
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: commonNotes.map((note) {
                    return ActionChip(
                      label: Text(note, style: const TextStyle(fontSize: 10)),
                      onPressed: () {
                        setState(() {
                          // Append to existing notes instead of replacing
                          if (_noteController.text.isNotEmpty &&
                              !_noteController.text.endsWith('\n')) {
                            _noteController.text += '\n';
                          }
                          _noteController.text += note;
                        });
                      },
                      backgroundColor: AppTheme.surfaceVariant,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _noteController,
                  onChanged: (_) {
                    setState(() {});
                  },
                  decoration: InputDecoration(
                    hintText: 'Add call notes...',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(
                        color: AppTheme.divider,
                        width: 0.5,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(
                        color: AppTheme.divider,
                        width: 0.5,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(
                        color: AppTheme.primary,
                        width: 1,
                      ),
                    ),
                  ),
                  maxLines: null,
                  minLines: 2,
                  textInputAction: TextInputAction.newline,
                  style: const TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 16),
                // Stage section
                const Text(
                  'Move to Stage',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: provider.stages.map((stage) {
                    final isSelected = _selectedStage == stage.id;
                    final isCurrent = widget.lead.stageId == stage.id;
                    return FilterChip(
                      label: Text(
                        stage.name,
                        style: const TextStyle(fontSize: 11),
                      ),
                      selected: isSelected,
                      showCheckmark: false,
                      onSelected: (selected) {
                        setState(() {
                          _selectedStage = selected ? stage.id : null;
                        });
                      },
                      backgroundColor: isCurrent
                          ? AppTheme.primary.withOpacity(0.1)
                          : AppTheme.surfaceVariant,
                      selectedColor: AppTheme.primary.withOpacity(0.2),
                      side: BorderSide(
                        color: isSelected
                            ? AppTheme.primary
                            : (isCurrent
                                  ? AppTheme.primary.withOpacity(0.5)
                                  : AppTheme.divider),
                        width: isSelected ? 1.5 : (isCurrent ? 1 : 0.5),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    ElevatedButton.icon(
                      onPressed: _isFormValid() ? _handleSubmit : null,
                      icon: const Icon(Icons.check_circle_rounded, size: 18),
                      label: const Text('Log & Close'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

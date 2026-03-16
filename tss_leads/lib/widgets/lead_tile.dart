import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:tss_leads/models/lead.dart';
import 'package:tss_leads/models/stage.dart';
import 'package:tss_leads/theme/app_theme.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/services/api_service.dart';

import 'quick_followup_form.dart';
import 'quick_call_log_form.dart';

class LeadTile extends StatelessWidget {
  final Lead lead;
  final VoidCallback onTap;

  const LeadTile({super.key, required this.lead, required this.onTap});

  Color _getStageColor(BuildContext context, String stageId, String stageName) {
    final stages = context.read<LeadsProvider>().stages;

    Stage? stage;
    if (stageName != 'Unknown' && stageName.isNotEmpty) {
      stage = stages.firstWhere(
        (s) => s.name == stageName,
        orElse: () => Stage(
          id: stageId,
          companyId: '',
          name: stageName,
          color: '#999999',
          order: 0,
          isDefault: false,
          isFinal: false,
          isActive: true,
        ),
      );
    } else {
      stage = stages.firstWhere(
        (s) => s.id == stageId,
        orElse: () => Stage(
          id: stageId,
          companyId: '',
          name: 'Unknown',
          color: '#999999',
          order: 0,
          isDefault: false,
          isFinal: false,
          isActive: true,
        ),
      );
    }

    try {
      return Color(int.parse(stage.color.replaceFirst('#', '0xff')));
    } catch (_) {
      return AppTheme.primary;
    }
  }

  IconData _getCallStatusIcon(String callStatus) {
    switch (callStatus) {
      case 'picked':
        return Icons.check;
      case 'not_picked':
        return Icons.close;
      case 'busy':
        return Icons.schedule;
      case 'switched_off':
        return Icons.phone_disabled;
      case 'invalid':
        return Icons.error;
      default:
        return Icons.call;
    }
  }

  Color _getCallStatusColor(String callStatus) {
    switch (callStatus) {
      case 'picked':
        return Colors.green;
      case 'not_picked':
        return Colors.red;
      case 'busy':
        return Colors.orange;
      case 'switched_off':
        return Colors.grey;
      case 'invalid':
        return Colors.red;
      default:
        return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeadsProvider>();
    final isSelected = provider.isLeadSelected(lead.id);
    final isSelectionMode = provider.isSelectionMode;

    return GestureDetector(
      onLongPress: () => provider.toggleLeadSelection(lead.id),
      child: InkWell(
        onTap: isSelectionMode
            ? () => provider.toggleLeadSelection(lead.id)
            : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primary.withOpacity(0.08)
                : Colors.transparent,
            border: Border(
              bottom: BorderSide(color: AppTheme.divider, width: 0.5),
            ),
          ),
          child: Column(
            children: [
              // First Row: Avatar + Phone/Name/Details
              Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isSelectionMode)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Checkbox(
                    value: isSelected,
                    onChanged: (_) => provider.toggleLeadSelection(lead.id),
                    side: const BorderSide(color: AppTheme.primary, width: 1.5),
                  ),
                ),
              // Avatar stack - circle above, square below
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Small circular avatar on top
                  Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.primary, width: 1.5),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Show lead initial if no call status
                        if (lead.callStatus == 'not_called')
                          Text(
                            lead.contact.name[0].toUpperCase(),
                            style: const TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 10,
                            ),
                          )
                        // Show call status icon if call was made
                        else
                          Icon(
                            _getCallStatusIcon(lead.callStatus),
                            size: 12,
                            color: _getCallStatusColor(lead.callStatus),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 2),
                  // Square Avatar with Stage abbreviation below
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _getStageColor(
                          context,
                          lead.stageId,
                          lead.stageName,
                        ),
                        width: 1.5,
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Text(
                          lead.stageName.length > 2
                              ? lead.stageName.substring(0, 2).toUpperCase()
                              : lead.stageName.toUpperCase(),
                          style: TextStyle(
                            color: _getStageColor(
                              context,
                              lead.stageId,
                              lead.stageName,
                            ),
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            lead.contact.name,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.onSurface,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _SourceBadge(source: lead.source),
                            const SizedBox(width: 3),
                            Consumer<LeadsProvider>(
                              builder: (context, provider, _) {
                                final assigneeName =
                                    provider.getUserNameById(
                                      lead.assignedTo.userId,
                                    ) ??
                                    lead.assignedTo.userId;
                                return Text(
                                  assigneeName,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: AppTheme.onSurfaceMuted,
                                    fontWeight: FontWeight.w400,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                );
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.call_outlined,
                          size: 11,
                          color: AppTheme.onSurfaceMuted,
                        ),
                        const SizedBox(width: 3),
                        Expanded(
                          flex: 2,
                          child: Text(
                            lead.contact.phone,
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.onSurfaceMuted,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Next followup date
                        _NextFollowupRowCompact(
                          nextFollowupDateTime: lead.nextFollowupDateTime,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.apartment_rounded,
                          size: 11,
                          color: AppTheme.onSurfaceMuted,
                        ),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            lead.details.projectId,
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.onSurfaceMuted,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Quick action buttons (far right)
                        _QuickActionButtons(lead: lead),
                      ],
                    ),
                  ],
                ),
              ),
            ],
              ),
              const SizedBox(height: 4),
              // Second Row: Note spanning full width
              Row(
                children: [
                  if (isSelectionMode)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Checkbox(
                        value: isSelected,
                        onChanged: (_) => provider.toggleLeadSelection(lead.id),
                        side: const BorderSide(color: AppTheme.primary, width: 1.5),
                      ),
                    ),
                  Expanded(
                    child: _FirstNoteRow(leadId: lead.id),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SourceBadge extends StatelessWidget {
  final LeadSource source;
  const _SourceBadge({required this.source});

  @override
  Widget build(BuildContext context) {
    return Icon(source.platformIcon, size: 10, color: AppTheme.onSurfaceMuted);
  }
}

class _QuickActionButtons extends StatelessWidget {
  final Lead lead;
  const _QuickActionButtons({required this.lead});

  String _cleanPhoneNumber(String phone) {
    return phone.replaceAll(RegExp(r'[^\d+]'), '');
  }

  String _formatPhoneForWhatsApp(String phone) {
    final cleaned = _cleanPhoneNumber(phone);
    return cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  }

  Future<void> _launchUrl(BuildContext context, String urlString) async {
    try {
      final Uri url = Uri.parse(urlString);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not launch $urlString'),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  void _showFollowupTypeBottomSheet(BuildContext context, Lead lead) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => QuickFollowupForm(leadId: lead.id),
    );
  }

  void _showCallLoggingSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => QuickCallLogForm(lead: lead),
    );
  }

  static Future<void> _dialPhone(String phoneNumber) async {
    try {
      final cleaned = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
      String formattedPhone = cleaned;
      if (!cleaned.startsWith('+')) {
        if (cleaned.length == 10) {
          formattedPhone = '+1$cleaned';
        } else if (cleaned.length == 11 && cleaned.startsWith('1')) {
          formattedPhone = '+$cleaned';
        } else {
          formattedPhone = '+$cleaned';
        }
      }

      final Uri url = Uri.parse('tel:$formattedPhone');
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      // Error handling done at UI level
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Call button
        _ActionButton(
          icon: Icons.call_outlined,
          label: 'Call',
          onTap: () async {
            // Dial immediately and log the activity
            await _QuickActionButtons._dialPhone(lead.contact.phone);

            // Log call_logged activity
            try {
              final apiService = ApiService();
              final userId = apiService.userId ?? '';
              if (userId.isNotEmpty) {
                await apiService.logActivity(
                  userId: userId,
                  activityType: 'call_logged',
                  entityType: 'lead',
                  entityId: lead.id,
                  description: 'Call initiated',
                  metadata: {'phone': lead.contact.phone},
                );
              }
            } catch (e) {
              print('Error logging call activity: $e');
            }

            // Then show the logging sheet
            _showCallLoggingSheet(context);
          },
        ),
        const SizedBox(width: 12),
        // WhatsApp button
        _ActionButton(
          icon: Icons.message_outlined,
          label: 'WhatsApp',
          onTap: () async {
            final phone = _formatPhoneForWhatsApp(lead.contact.phone);
            if (phone.isNotEmpty) {
              final apiService = ApiService();
              await apiService.logActivity(
                userId: apiService.userId ?? '',
                activityType: 'whatsapp_sent',
                entityType: 'lead',
                entityId: lead.id,
                description:
                    'WhatsApp message initiated to ${lead.contact.phone}',
                metadata: {'phone': lead.contact.phone},
              );
              _launchUrl(context, 'https://wa.me/$phone');
            }
          },
        ),
        const SizedBox(width: 12),
        // Followup button
        _ActionButton(
          icon: Icons.schedule_outlined,
          label: 'Followup',
          onTap: () {
            _showFollowupTypeBottomSheet(context, lead);
          },
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label,
      child: GestureDetector(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          child: Icon(icon, size: 18, color: AppTheme.onSurfaceMuted),
        ),
      ),
    );
  }
}

class _QuickCallLogForm extends StatefulWidget {
  final Lead lead;
  const _QuickCallLogForm({required this.lead});

  @override
  State<_QuickCallLogForm> createState() => _QuickCallLogFormState();
}

class _QuickCallLogFormState extends State<_QuickCallLogForm> {
  String? _selectedStatus;
  String? _selectedStage;
  bool _needsFollowup = false;
  final _noteController = TextEditingController();

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
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  bool _isFormValid() {
    return _selectedStatus != null && _noteController.text.trim().isNotEmpty;
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
    final provider = context.read<LeadsProvider>();

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
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Followup icon button
                    Tooltip(
                      message: 'Schedule followup',
                      child: IconButton(
                        onPressed: () {
                          setState(() => _needsFollowup = !_needsFollowup);
                        },
                        icon: Icon(
                          Icons.schedule_rounded,
                          size: 20,
                          color: _needsFollowup
                              ? AppTheme.primary
                              : AppTheme.onSurfaceMuted,
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
                      _noteController.text = note;
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
              maxLines: 2,
              minLines: 1,
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
                  label: Text(stage.name, style: const TextStyle(fontSize: 11)),
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
  }
}

class _FirstNoteRow extends StatelessWidget {
  final String leadId;
  const _FirstNoteRow({required this.leadId});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: ApiService().getLeadNotes(leadId),
      builder: (context, snapshot) {
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox.shrink();
        }

        final notes = snapshot.data!;
        final firstNote = notes.isNotEmpty ? notes.first : null;

        if (firstNote == null) {
          return const SizedBox.shrink();
        }

        // Extract content from note - handle both Note objects and maps
        String noteContent = '';
        if (firstNote.runtimeType.toString().contains('Note')) {
          noteContent = firstNote.content ?? '';
        } else if (firstNote is Map) {
          noteContent = firstNote['content'] ?? firstNote['description'] ?? '';
        }

        if (noteContent.isEmpty) {
          return const SizedBox.shrink();
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 2),
              child: Icon(
                Icons.note_outlined,
                size: 11,
                color: AppTheme.onSurfaceMuted,
              ),
            ),
            const SizedBox(width: 3),
            Expanded(
              child: Text(
                noteContent,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.onSurfaceMuted,
                  fontWeight: FontWeight.w400,
                  fontStyle: FontStyle.italic,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _NextFollowupRowCompact extends StatelessWidget {
  final String? nextFollowupDateTime;
  const _NextFollowupRowCompact({required this.nextFollowupDateTime});

  @override
  Widget build(BuildContext context) {
    if (nextFollowupDateTime == null || nextFollowupDateTime!.isEmpty) {
      return const SizedBox.shrink();
    }

    try {
      final scheduledFor = parseDateTime(nextFollowupDateTime!);

      // Format date
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final followupDate = DateTime(
        scheduledFor.year,
        scheduledFor.month,
        scheduledFor.day,
      );

      String dateText;
      if (followupDate == today) {
        dateText = 'Today';
      } else if (followupDate ==
          DateTime(now.year, now.month, now.day).add(const Duration(days: 1))) {
        dateText = 'Tomorrow';
      } else {
        dateText =
            '${scheduledFor.day}/${scheduledFor.month}/${scheduledFor.year}';
      }

      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.schedule_outlined,
            size: 11,
            color: AppTheme.onSurfaceMuted,
          ),
          const SizedBox(width: 3),
          Text(
            dateText,
            style: const TextStyle(
              fontSize: 10,
              color: AppTheme.onSurfaceMuted,
              fontWeight: FontWeight.w400,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      );
    } catch (e) {
      return const SizedBox.shrink();
    }
  }
}

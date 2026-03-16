import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/services/api_service.dart';
import 'package:tss_leads/theme/app_theme.dart';

class QuickFollowupForm extends StatefulWidget {
  final String leadId;

  const QuickFollowupForm({required this.leadId});

  @override
  State<QuickFollowupForm> createState() => _QuickFollowupFormState();
}

class _QuickFollowupFormState extends State<QuickFollowupForm> {
  late TextEditingController _noteController;
  String _selectedType = 'call';
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = TimeOfDay(hour: 11, minute: 0);
  bool _loading = false;

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

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  bool _isSameDay(DateTime date1, DateTime date2) {
    return date1.year == date2.year &&
        date1.month == date2.month &&
        date1.day == date2.day;
  }

  Future<void> _submitFollowup() async {
    if (_noteController.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please add a note')));
      return;
    }

    setState(() => _loading = true);
    try {
      final localDateTime = DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

      // Validate that scheduled time is in the future
      if (localDateTime.isBefore(DateTime.now())) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Followup time must be in the future'),
              duration: Duration(seconds: 3),
            ),
          );
        }
        setState(() => _loading = false);
        return;
      }

      // Convert local datetime to UTC for backend
      final scheduledDateTime = localDateTime.toUtc();

      final apiService = ApiService();
      apiService.createFollowup(
        leadId: widget.leadId,
        type: _selectedType,
        scheduledFor: scheduledDateTime,
        priority: 'medium',
        note: _noteController.text,
      );

      if (mounted) {
        // Parse the response into a Followup object
        // Update the provider with the new followup using simple fields
        if (mounted) {
          context.read<LeadsProvider>().addFollowup(
            widget.leadId,
            scheduledDateTime.toIso8601String(),
            _noteController.text,
          );
        }
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Followup scheduled! You will receive a notification.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Text(
              'Schedule Followup',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),

            const SizedBox(height: 16),

            // Date section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Date',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                SizedBox(
                  height: 32,
                  child: OutlinedButton.icon(
                    onPressed: _selectDate,
                    icon: const Icon(Icons.calendar_today, size: 14),
                    label: Text(
                      DateFormat('MMM dd').format(_selectedDate),
                      style: const TextStyle(fontSize: 12),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      side: const BorderSide(color: AppTheme.divider),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _DateChip(
                  label: 'Today',
                  date: DateTime.now(),
                  isSelected: _isSameDay(_selectedDate, DateTime.now()),
                  onTap: () => setState(() => _selectedDate = DateTime.now()),
                ),
                _DateChip(
                  label: 'Tomorrow',
                  date: DateTime.now().add(const Duration(days: 1)),
                  isSelected: _isSameDay(
                    _selectedDate,
                    DateTime.now().add(const Duration(days: 1)),
                  ),
                  onTap: () => setState(
                    () => _selectedDate = DateTime.now().add(
                      const Duration(days: 1),
                    ),
                  ),
                ),
                _DateChip(
                  label: 'Next Week',
                  date: DateTime.now().add(const Duration(days: 7)),
                  isSelected: _isSameDay(
                    _selectedDate,
                    DateTime.now().add(const Duration(days: 7)),
                  ),
                  onTap: () => setState(
                    () => _selectedDate = DateTime.now().add(
                      const Duration(days: 7),
                    ),
                  ),
                ),
                _DateChip(
                  label: 'Next Month',
                  date: DateTime.now().add(const Duration(days: 30)),
                  isSelected: _isSameDay(
                    _selectedDate,
                    DateTime.now().add(const Duration(days: 30)),
                  ),
                  onTap: () => setState(
                    () => _selectedDate = DateTime.now().add(
                      const Duration(days: 30),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Time section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Time',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurfaceMuted,
                  ),
                ),
                SizedBox(
                  height: 32,
                  child: OutlinedButton.icon(
                    onPressed: _selectTime,
                    icon: const Icon(Icons.access_time, size: 14),
                    label: Text(
                      _selectedTime.format(context),
                      style: const TextStyle(fontSize: 12),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      side: const BorderSide(color: AppTheme.divider),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _TimeChip(
                  time: TimeOfDay(hour: 11, minute: 0),
                  label: '11:00 AM',
                  isSelected: _selectedTime.hour == 11,
                  onTap: () => setState(
                    () => _selectedTime = TimeOfDay(hour: 11, minute: 0),
                  ),
                ),
                _TimeChip(
                  time: TimeOfDay(hour: 14, minute: 0),
                  label: '2:00 PM',
                  isSelected: _selectedTime.hour == 14,
                  onTap: () => setState(
                    () => _selectedTime = TimeOfDay(hour: 14, minute: 0),
                  ),
                ),
                _TimeChip(
                  time: TimeOfDay(hour: 15, minute: 0),
                  label: '3:00 PM',
                  isSelected: _selectedTime.hour == 15,
                  onTap: () => setState(
                    () => _selectedTime = TimeOfDay(hour: 15, minute: 0),
                  ),
                ),
                _TimeChip(
                  time: TimeOfDay(hour: 17, minute: 0),
                  label: '5:00 PM',
                  isSelected: _selectedTime.hour == 17,
                  onTap: () => setState(
                    () => _selectedTime = TimeOfDay(hour: 17, minute: 0),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Note section
            const Text(
              'Note',
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
              children: [
                _NoteChip(
                  label: 'Site visit scheduled',
                  onTap: () {
                    _noteController.text = 'Site visit scheduled';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Shared brochure',
                  onTap: () {
                    _noteController.text = 'Shared brochure';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Sent floor plan',
                  onTap: () {
                    _noteController.text = 'Sent floor plan';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Price negotiation',
                  onTap: () {
                    _noteController.text = 'Price negotiation';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Loan assistance',
                  onTap: () {
                    _noteController.text = 'Loan assistance';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Ready to book',
                  onTap: () {
                    _noteController.text = 'Ready to book';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Awaiting documents',
                  onTap: () {
                    _noteController.text = 'Awaiting documents';
                    setState(() {});
                  },
                ),
                _NoteChip(
                  label: 'Follow up call',
                  onTap: () {
                    _noteController.text = 'Follow up call';
                    setState(() {});
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _noteController,
              maxLines: 2,
              minLines: 2,
              onChanged: (_) {
                setState(() {});
              },
              decoration: InputDecoration(
                hintText: 'Add notes...',
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
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 20),

            // Submit button
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton.icon(
                  onPressed: _loading ? null : _submitFollowup,
                  icon: _loading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : const Icon(Icons.check_circle_rounded, size: 18),
                  label: const Text('Schedule'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppTheme.divider,
                    disabledForegroundColor: AppTheme.onSurfaceMuted,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  final TimeOfDay time;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TimeChip({
    required this.time,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      selected: isSelected,
      showCheckmark: false,
      onSelected: (_) => onTap(),
      backgroundColor: AppTheme.surfaceVariant,
      selectedColor: AppTheme.primary.withOpacity(0.2),
      side: BorderSide(
        color: isSelected ? AppTheme.primary : AppTheme.divider,
        width: isSelected ? 1.5 : 0.5,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }
}

class _DateChip extends StatelessWidget {
  final String label;
  final DateTime date;
  final bool isSelected;
  final VoidCallback onTap;

  const _DateChip({
    required this.label,
    required this.date,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      selected: isSelected,
      showCheckmark: false,
      onSelected: (_) => onTap(),
      backgroundColor: AppTheme.surfaceVariant,
      selectedColor: AppTheme.primary.withOpacity(0.2),
      side: BorderSide(
        color: isSelected ? AppTheme.primary : AppTheme.divider,
        width: isSelected ? 1.5 : 0.5,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }
}

class _NoteChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _NoteChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 10)),
      onPressed: onTap,
      backgroundColor: AppTheme.surfaceVariant,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

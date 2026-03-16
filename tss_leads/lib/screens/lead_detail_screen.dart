import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:tss_leads/models/lead.dart';
import 'package:tss_leads/models/note.dart';
import 'package:tss_leads/models/stage.dart';
import 'package:tss_leads/providers/leads_provider.dart';
import 'package:tss_leads/providers/auth_provider.dart';
import 'package:tss_leads/services/api_service.dart';
import 'package:tss_leads/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:tss_leads/widgets/quick_followup_form.dart';
import 'package:tss_leads/widgets/quick_call_log_form.dart';

class LeadDetailScreen extends StatefulWidget {
  final String leadId; // Use ID to stay reactive
  final String? initialFollowupType;
  const LeadDetailScreen({
    super.key,
    required this.leadId,
    this.initialFollowupType,
  });

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen> {
  String _followupFilter = 'all'; // all, today, tomorrow, overdue
  String _activityFilter = 'all'; // all, call, whatsapp, note, followup
  List<Note> _notes = [];
  bool _loadingNotes = false;
  bool _showAddNoteForm = false;
  bool _showAllActivities = false;
  String? _editingNoteId; // Track which note is being edited
  final TextEditingController _noteController = TextEditingController();
  final ApiService _apiService = ApiService();

  // Speech to Text
  final stt.SpeechToText _speechToText = stt.SpeechToText();
  bool _isListening = false;
  String _ongoingSpeech = '';

  // Activities
  List<Activity> _activities = [];
  bool _loadingActivities = false;
  bool _isRefreshingFollowups = false;

  // Stages and forms
  List<Stage> _stages = [];
  Map<String, List<StageForm>> _stageForms = {};
  Set<String> _expandedStageIds = {};

  // Track previous stage to detect changes
  String? _previousStageId;

  // Track if we've refreshed the lead data
  bool _leadRefreshed = false;

  @override
  void initState() {
    super.initState();
    _loadNotes();
    _loadActivities();
    // Load stages from provider instead of fetching directly
    // They should already be loaded after login
    _syncStagesFromProvider();

    // Force fresh lead data from API to ensure followups are current
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LeadsProvider>().refreshLeadFromApi(widget.leadId).then((_) {
        setState(() => _leadRefreshed = true);
      });
    });

    // Initialize speech to text
    _initSpeechToText();
  }

  void _initSpeechToText() async {
    try {
      await _speechToText.initialize(
        onError: (error) {
          setState(() => _isListening = false);
        },
        onStatus: (status) {
          // Silently handle status
        },
      );
      // Initialization complete
    } catch (e) {
      // Silently fail - speech-to-text is optional
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    _speechToText.stop();
    super.dispose();
  }

  Future<void> _loadNotes() async {
    setState(() => _loadingNotes = true);
    try {
      final notes = await _apiService.getLeadNotes(widget.leadId);
      setState(() {
        _notes = notes;
        _loadingNotes = false;
      });
      // Cache notes in provider for display on lead tile
      if (mounted) {
        context.read<LeadsProvider>().setCacheNotesForLead(
          widget.leadId,
          notes,
        );
      }
    } catch (e) {
      setState(() => _loadingNotes = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading notes: $e')));
      }
    }
  }

  Future<void> _loadActivities() async {
    setState(() => _loadingActivities = true);
    try {
      final activities = await _apiService.getLeadActivities(widget.leadId);
      setState(() {
        _activities = activities;
        _loadingActivities = false;
      });
    } catch (e) {
      setState(() => _loadingActivities = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading activities: $e')));
      }
    }
  }

  Future<void> _syncStagesFromProvider() {
    try {
      final leadsProvider = context.read<LeadsProvider>();
      setState(() {
        _stages = leadsProvider.stages;
        print(
          '🎨 LeadDetailScreen: Synced ${_stages.length} stages from provider',
        );
        if (_stages.isNotEmpty) {
          print('   Stages: ${_stages.map((s) => s.name).join(", ")}');
        } else {
          print('   ⚠️ WARNING: No stages available in provider!');
        }
      });
    } catch (e) {
      print('❌ LeadDetailScreen: Error syncing stages: $e');
      // Stages not available yet, will be available when navigating from LeadsScreen
    }
    return Future.value();
  }

  Future<void> _addNote() async {
    if (_noteController.text.isEmpty) return;

    try {
      if (_editingNoteId != null) {
        // Edit mode
        print('✏️ Updating note: ${_noteController.text}');
        await _apiService.updateNote(
          widget.leadId,
          _editingNoteId!,
          _noteController.text,
        );
        print('✅ Note updated successfully');
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Note updated')));
        }
      } else {
        // Add mode
        print('📝 Adding note: ${_noteController.text}');
        await _apiService.addLeadNote(widget.leadId, _noteController.text);
        print('✅ Note added successfully');
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Note added')));
        }
      }
      _noteController.clear();
      setState(() {
        _showAddNoteForm = false;
        _editingNoteId = null;
      });
      await _loadNotes();
    } catch (e) {
      print('❌ Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _toggleSpeechToText() {
    if (!_isListening) {
      _startListening();
    } else {
      _stopListening();
    }
  }

  void _startListening() async {
    if (!_speechToText.isAvailable) {
      print('❌ Speech to text not available');
      return;
    }
    try {
      setState(() {
        _isListening = true;
        _ongoingSpeech = '';
      });
      await _speechToText.listen(
        onResult: (result) {
          setState(() {
            _ongoingSpeech = result.recognizedWords;
            // Append speech to note content as user speaks
            if (result.finalResult) {
              // Add space before appending if there's already content
              if (_noteController.text.isNotEmpty &&
                  !_noteController.text.endsWith(' ')) {
                _noteController.text += ' ';
              }
              _noteController.text += _ongoingSpeech;
              _ongoingSpeech = '';
            }
          });
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
      );
    } catch (e) {
      print('❌ Error starting listening: $e');
      setState(() => _isListening = false);
    }
  }

  void _stopListening() async {
    try {
      await _speechToText.stop();
      setState(() => _isListening = false);
    } catch (e) {
      print('❌ Error stopping listening: $e');
    }
  }

  Future<void> _onFollowupSuccess() async {
    // Set loading state before refresh
    setState(() => _isRefreshingFollowups = true);
    try {
      // Refresh the current lead to get updated followups
      await context.read<LeadsProvider>().refreshLeadFromApi(widget.leadId);
      // Also reload activities to show the newly created followup activity
      await _loadActivities();
    } finally {
      // Clear loading state after refresh completes
      if (mounted) {
        setState(() => _isRefreshingFollowups = false);
      }
    }
  }

  Future<void> _onStageChanged() async {
    // Refresh lead data from API to get updated followups and stage info
    await context.read<LeadsProvider>().refreshLeadFromApi(widget.leadId);
    // Reload activities to immediately show the stage change activity
    await _loadActivities();
  }

  Future<void> _onCallStatusChanged() async {
    // Refresh lead data from API to get updated followups and call status info
    await context.read<LeadsProvider>().refreshLeadFromApi(widget.leadId);
    // Reload activities to immediately show the call status change activity
    await _loadActivities();
  }

  Future<void> _onFollowupDeleted() async {
    // Refresh to ensure consistency (delete already removed optimistically in _deleteFollowup)
    await context.read<LeadsProvider>().refreshLeadFromApi(widget.leadId);
  }

  /// Clean phone number to just digits and + sign
  String _cleanPhoneNumber(String phone) {
    return phone.replaceAll(RegExp(r'[^\d+]'), '');
  }

  /// Format phone for WhatsApp (removes + prefix)
  String _formatPhoneForWhatsApp(String phone) {
    final cleaned = _cleanPhoneNumber(phone);
    return cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  }

  /// Format phone for tel: scheme (tel: URIs need international format with +)
  String _formatPhoneForTel(String phone) {
    final cleaned = _cleanPhoneNumber(phone);
    // If already has +, use as-is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    // If 10 digits, assume US and add +1
    if (cleaned.length == 10 && !cleaned.startsWith('1')) {
      return '+1$cleaned';
    }
    // If 11 digits starting with 1, add +
    if (cleaned.length == 11 && cleaned.startsWith('1')) {
      return '+$cleaned';
    }
    // For other cases, try to add + prefix
    return '+$cleaned';
  }

  void _launchUrl(String urlString) async {
    try {
      // On web, tel: scheme doesn't work
      if (kIsWeb && urlString.startsWith('tel:')) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Phone calls not available in browser. Use WhatsApp instead.',
              ),
              duration: Duration(seconds: 2),
            ),
          );
        }
        return;
      }

      final Uri url = Uri.parse(urlString);
      await _attemptLaunchUrl(url);
    } catch (e) {
      print('❌ Error launching URL: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not complete action: $e')),
        );
      }
    }
  }

  void _showCallLoggingSheet(BuildContext context, Lead lead) {
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

  Future<void> _attemptLaunchUrl(Uri url) async {
    try {
      print('📱 Attempting to launch: ${url.toString()} (isWeb: $kIsWeb)');
      if (await canLaunchUrl(url)) {
        await launchUrl(
          url,
          mode: LaunchMode.externalApplication,
          webOnlyWindowName: '_blank',
        );
        print('✅ Successfully launched: ${url.toString()}');
      } else {
        print('❌ Cannot launch URL: ${url.toString()}');

        // For tel: scheme, provide helpful message about phone app
        if (url.scheme == 'tel') {
          print('⚠️ Phone app not available on this device');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Phone app not available. Try WhatsApp or email the lead contact.',
                ),
                duration: Duration(seconds: 4),
              ),
            );
          }
          return;
        }

        // For web, try launching in browser anyway
        if (kIsWeb) {
          try {
            await launchUrl(url, webOnlyWindowName: '_blank');
            print('✅ Launched in browser: ${url.toString()}');
          } catch (e) {
            throw 'Could not launch ${url.toString()}';
          }
        } else {
          throw 'Could not launch ${url.toString()}\nPlease ensure the URL is valid.';
        }
      }
    } catch (e) {
      print('❌ Error launching URL: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not complete action: $e'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watch the individual lead from provider using unfiltered lookup
    // This ensures we always get the current lead and followups
    final leadsProvider = context.watch<LeadsProvider>();
    final lead = leadsProvider.getLeadById(widget.leadId);

    // Don't show stale data - wait for fresh API data
    if (!_leadRefreshed || lead == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    // Detect stage change and clear forms for old stage
    if (_previousStageId != null && _previousStageId != lead.stageId) {
      _stageForms.remove(_previousStageId);
      // Auto-expand new stage and collapse old one
      _expandedStageIds.clear();
      _expandedStageIds.add(lead.stageId);
    }
    _previousStageId = lead.stageId;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        titleSpacing: 4,
        title: Text(
          lead.contact.name,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          // Edit/Delete Menu
          _DetailsActionMenu(lead: lead),
          _AssignmentDropdown(lead: lead),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            children: [
              // Phone and Email (stacked, tightly together)
              Column(
                children: [
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(
                        ClipboardData(text: lead.contact.phone),
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Phone copied'),
                          duration: Duration(milliseconds: 800),
                        ),
                      );
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.call_outlined,
                            size: 16,
                            color: AppTheme.onSurfaceMuted,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              lead.contact.phone,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.onSurface,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.call_outlined,
                              size: 27,
                              color: Color(0xFF0288D1),
                            ),
                            onPressed: () async {
                              final phone = _formatPhoneForTel(
                                lead.contact.phone,
                              );
                              if (phone.isNotEmpty) {
                                try {
                                  final userId = _apiService.userId ?? '';
                                  if (userId.isNotEmpty) {
                                    await _apiService.logActivity(
                                      userId: userId,
                                      activityType: 'call_logged',
                                      entityType: 'lead',
                                      entityId: widget.leadId,
                                      description:
                                          'Call initiated to ${lead.contact.phone}',
                                      metadata: {'phone': phone},
                                    );
                                  }
                                  _loadActivities();
                                } catch (e) {}
                                _launchUrl('tel:$phone');
                                _showCallLoggingSheet(context, lead);
                              }
                            },
                            tooltip: 'Call',
                            padding: EdgeInsets.zero,
                            iconSize: 25,
                            splashRadius: 22,
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: const FaIcon(
                              FontAwesomeIcons.whatsapp,
                              size: 30,
                              color: Color(0xFF25D366),
                            ),
                            onPressed: () async {
                              final phone = _formatPhoneForWhatsApp(
                                lead.contact.phone,
                              );
                              if (phone.isNotEmpty) {
                                await _apiService.logActivity(
                                  userId: _apiService.userId ?? '',
                                  activityType: 'whatsapp_sent',
                                  entityType: 'lead',
                                  entityId: widget.leadId,
                                  description:
                                      'WhatsApp message initiated to ${lead.contact.phone}',
                                  metadata: {'phone': lead.contact.phone},
                                );
                                _launchUrl('https://wa.me/$phone');
                              }
                            },
                            tooltip: 'WhatsApp',
                            padding: EdgeInsets.zero,
                            iconSize: 25,
                            splashRadius: 22,
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: const Icon(
                              Icons.note_outlined,
                              size: 28,
                              color: Color(0xFF1565C0),
                            ),
                            onPressed: () => setState(
                              () => _showAddNoteForm = !_showAddNoteForm,
                            ),
                            tooltip: 'Add Note',
                            padding: EdgeInsets.zero,
                            iconSize: 25,
                            splashRadius: 22,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 0),
                  Transform.translate(
                    offset: const Offset(0, -8),
                    child: GestureDetector(
                      onTap: lead.contact.email != null
                          ? () {
                              Clipboard.setData(
                                ClipboardData(text: lead.contact.email!),
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Email copied'),
                                  duration: Duration(milliseconds: 800),
                                ),
                              );
                            }
                          : null,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.mail_outline_rounded,
                              size: 16,
                              color: AppTheme.onSurfaceMuted,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                lead.contact.email ?? 'No email',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: lead.contact.email != null
                                      ? AppTheme.onSurface
                                      : AppTheme.onSurfaceMuted,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.schedule_outlined,
                                size: 25,
                                color: Color(0xFFE65100),
                              ),
                              onPressed: () => showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                shape: const RoundedRectangleBorder(
                                  borderRadius: BorderRadius.vertical(
                                    top: Radius.circular(28),
                                  ),
                                ),
                                builder: (_) =>
                                    QuickFollowupForm(leadId: widget.leadId),
                              ),
                              tooltip: 'Schedule Followup',
                              padding: EdgeInsets.zero,
                              iconSize: 25,
                              splashRadius: 22,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),

              // Followups Section
              _FollowupsSection(
                lead: lead,
                leadId: widget.leadId,
                filter: _followupFilter,
                onFilterChanged: (f) => setState(() => _followupFilter = f),
                onDeleteFollowup: _onFollowupDeleted,
                apiService: context.read<ApiService>(),
                onFollowupSuccess: _onFollowupSuccess,
                isRefreshing: _isRefreshingFollowups,
                initialFollowupType: widget.initialFollowupType,
              ),

              // Call Status
              const Text(
                'CALL STATUS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.2,
                ),
              ),
              _CallStatusChips(
                lead: lead,
                onCallStatusChanged: _onCallStatusChanged,
              ),
              const SizedBox(height: 8),

              // Interactive Pipeline Chips
              _PipelineChips(
                lead: lead,
                stages: _stages,
                onStageChanged: _onStageChanged,
              ),
              const SizedBox(height: 16),

              // Notes Section
              _NotesSection(
                leadId: widget.leadId,
                notes: _notes,
                loadingNotes: _loadingNotes,
                showAddNoteForm: _showAddNoteForm,
                isEditing: _editingNoteId != null,
                isListening: _isListening,
                noteController: _noteController,
                onToggleForm: () {
                  _noteController.clear();
                  setState(() {
                    _showAddNoteForm = !_showAddNoteForm;
                    _editingNoteId = null;
                  });
                },
                onAddNote: _addNote,
                onToggleSpeech: _toggleSpeechToText,
                onEditNote: (note) {
                  _noteController.text = note.content;
                  setState(() {
                    _editingNoteId = note.id;
                    _showAddNoteForm = true;
                  });
                },
                onDeleteNote: (note) async {
                  try {
                    await _apiService.deleteNote(widget.leadId, note.id);
                    await _loadNotes();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Note deleted')),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error deleting note: $e')),
                      );
                    }
                  }
                },
              ),
              const SizedBox(height: 8),

              // Contact details (simplified - location only)
              if (lead.details.location != null)
                _InfoSection(
                  title: 'CONTACT',
                  items: [
                    _InfoRow(
                      Icons.location_on_outlined,
                      'Location',
                      lead.details.location!,
                    ),
                  ],
                ),
              const SizedBox(height: 8),

              // Project Details
              _InfoSection(
                title: 'PROJECT DETAILS',
                items: [
                  _InfoRow(
                    Icons.apartment_rounded,
                    'Project',
                    lead.details.projectId,
                  ),
                  if (lead.details.budget != null)
                    _InfoRow(
                      Icons.payments_outlined,
                      'Budget',
                      lead.details.budget!,
                    ),
                  if (lead.details.propertyType != null)
                    _InfoRow(
                      Icons.home_work_outlined,
                      'Type',
                      lead.details.propertyType!,
                    ),
                  if (lead.details.lastContactedAt != null)
                    _InfoRow(
                      Icons.history_rounded,
                      'Last Contact',
                      DateFormat(
                        'MMM d, h:mm a',
                      ).format(lead.details.lastContactedAt!),
                    ),
                  if (lead.details.lastContactType != null)
                    _InfoRow(
                      Icons.call_made_rounded,
                      'Contact Type',
                      lead.details.lastContactType!,
                    ),
                ],
              ),
              const SizedBox(height: 8),

              // Custom Fields Section
              if ((lead.details.customFields != null &&
                      lead.details.customFields!.isNotEmpty) ||
                  (lead.createdByUserId != null &&
                      lead.createdByUserId!.isNotEmpty) ||
                  lead.source.platform.isNotEmpty)
                _CustomFieldsSection(
                  customFields: lead.details.customFields ?? {},
                  createdByUserName: lead.createdByUserName,
                  createdByUserId: lead.createdByUserId,
                  source: lead.source.platform.isNotEmpty
                      ? lead.source.platform
                      : null,
                ),
              if ((lead.details.customFields != null &&
                      lead.details.customFields!.isNotEmpty) ||
                  (lead.createdByUserId != null &&
                      lead.createdByUserId!.isNotEmpty) ||
                  lead.source.platform.isNotEmpty)
                const SizedBox(height: 8),

              // Activities Section with Filters
              if (_loadingActivities)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: CircularProgressIndicator(),
                )
              else if (_activities.isNotEmpty) ...[
                const _SectionHeader(title: 'ACTIVITY LOG'),
                _ActivityFilters(
                  selectedFilter: _activityFilter,
                  onFilterChanged: (f) => setState(() {
                    _activityFilter = f;
                    _showAllActivities = false;
                  }),
                ),
                const SizedBox(height: 12),
                ...() {
                  final filtered = _getFilteredActivities(
                    _activities,
                    _activityFilter,
                  );
                  final visible = _showAllActivities
                      ? filtered
                      : filtered.take(12).toList();
                  return [
                    ...visible.map((a) => _ActivityTile(activity: a)),
                    if (filtered.length > 12)
                      Padding(
                        padding: const EdgeInsets.only(top: 4, bottom: 8),
                        child: GestureDetector(
                          onTap: () => setState(
                            () => _showAllActivities = !_showAllActivities,
                          ),
                          child: Text(
                            _showAllActivities
                                ? 'Show less'
                                : 'Read more (${filtered.length - 12} more)',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                  ];
                }(),
              ],
              const SizedBox(height: 16),
            ],
          ),
        ],
      ),
    );
  }

  List<Activity> _getFilteredActivities(
    List<Activity> activities,
    String filter,
  ) {
    if (filter == 'all') return activities;
    return activities
        .where((a) => a.type.toLowerCase().contains(filter.toLowerCase()))
        .toList();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Call Status Chips Widget
// ──────────────────────────────────────────────────────────────────────────────

class _CallStatusChips extends StatelessWidget {
  final Lead lead;
  final VoidCallback onCallStatusChanged;

  const _CallStatusChips({
    required this.lead,
    required this.onCallStatusChanged,
  });

  static const List<String> callStatuses = [
    'picked',
    'not_picked',
    'busy',
    'switched_off',
    'invalid',
  ];

  String _getDisplayLabel(String status) {
    switch (status) {
      case 'picked':
        return 'Picked';
      case 'not_picked':
        return 'Not Picked';
      case 'busy':
        return 'Busy/Callback';
      case 'switched_off':
        return 'Switched Off';
      case 'invalid':
        return 'Invalid';
      default:
        return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'picked':
        return const Color(0xFF4CAF50); // Green
      case 'not_picked':
        return const Color(0xFF9E9E9E); // Gray
      case 'busy':
        return const Color(0xFFFFA726); // Orange
      case 'switched_off':
        return const Color(0xFFF44336); // Red
      case 'invalid':
        return const Color(0xFF9C27B0); // Purple
      default:
        return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: callStatuses.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final status = callStatuses[i];
          final isSelected = lead.callStatus == status;
          final statusColor = _getStatusColor(status);

          return GestureDetector(
            onTap: () async {
              if (!isSelected) {
                await context.read<LeadsProvider>().updateLeadCallStatusViaAPI(
                  lead.id,
                  status,
                );
                onCallStatusChanged();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? statusColor : AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? statusColor : AppTheme.divider,
                  width: 1,
                ),
              ),
              child: Center(
                child: Text(
                  _getDisplayLabel(status),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? Colors.white : AppTheme.onSurfaceMuted,
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

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline Chips Widget
// ──────────────────────────────────────────────────────────────────────────────

class _PipelineChips extends StatelessWidget {
  final Lead lead;
  final List<Stage> stages;
  final VoidCallback onStageChanged;

  const _PipelineChips({
    required this.lead,
    required this.stages,
    required this.onStageChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (stages.isEmpty) {
      return const SizedBox(
        height: 36,
        child: Center(
          child: Text(
            'Loading stages...',
            style: TextStyle(fontSize: 12, color: AppTheme.onSurfaceMuted),
          ),
        ),
      );
    }

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: stages.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final stage = stages[i];
          final isSelected = lead.stageId == stage.id;

          // Parse stage color from hex string
          Color stageColor;
          try {
            stageColor = Color(
              int.parse(stage.color.replaceFirst('#', '0xff')),
            );
          } catch (_) {
            stageColor = AppTheme.primary;
          }

          return GestureDetector(
            onTap: () async {
              if (!isSelected) {
                await context.read<LeadsProvider>().updateLeadStageViaAPI(
                  lead.id,
                  stage.id,
                );
                onStageChanged();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? stageColor : AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? stageColor : AppTheme.divider,
                  width: 1,
                ),
              ),
              child: Center(
                child: Text(
                  stage.name,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? Colors.white : AppTheme.onSurfaceMuted,
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

class _DetailsActionMenu extends StatelessWidget {
  final Lead lead;
  const _DetailsActionMenu({required this.lead});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final leadsProvider = context.read<LeadsProvider>();

    // Only show menu if user is NOT a team lead
    if (authProvider.userIsTeamLead) {
      return const SizedBox.shrink();
    }

    return PopupMenuButton<String>(
      onSelected: (value) {
        if (value == 'delete') {
          _showDeleteConfirmation(context, lead.id, leadsProvider);
        } else if (value == 'won' || value == 'lost') {
          _changeLeadStatus(context, lead.id, value);
        }
      },
      itemBuilder: (BuildContext context) => [
        PopupMenuItem<String>(
          value: 'won',
          child: Row(
            children: const [
              Icon(
                Icons.check_circle_outline_rounded,
                size: 18,
                color: Colors.green,
              ),
              SizedBox(width: 12),
              Text('Convert to Won'),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'lost',
          child: Row(
            children: const [
              Icon(
                Icons.cancel_presentation_rounded,
                size: 18,
                color: Colors.red,
              ),
              SizedBox(width: 12),
              Text('Convert to Lost'),
            ],
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem<String>(
          value: 'delete',
          child: Row(
            children: [
              Icon(
                Icons.delete_outline_rounded,
                size: 18,
                color: Colors.redAccent,
              ),
              SizedBox(width: 12),
              Text('Delete Lead'),
            ],
          ),
        ),
      ],
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 8),
        child: Icon(Icons.more_vert_rounded, size: 20),
      ),
    );
  }

  void _showDeleteConfirmation(
    BuildContext context,
    String leadId,
    LeadsProvider provider,
  ) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Lead'),
        content: const Text(
          'Are you sure you want to delete this lead? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await provider.deleteLead(leadId);
              if (context.mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lead deleted successfully')),
                  );
                  Navigator.pop(context);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete lead')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _changeLeadStatus(
    BuildContext context,
    String leadId,
    String newStatus,
  ) {
    final statusText = newStatus == 'won' ? 'Won' : 'Lost';
    final statusColor = newStatus == 'won' ? Colors.green : Colors.red;

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Convert to $statusText?'),
        content: Text(
          'Are you sure you want to mark this lead as $statusText? This will move it to the completed stage.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                final apiService = context.read<ApiService>();
                await apiService.updateLeadStatus(leadId, newStatus);
                if (context.mounted) {
                  context.read<LeadsProvider>().loadLeads();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lead converted to $statusText')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: ${e.toString()}')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: statusColor),
            child: Text(
              'Convert to $statusText',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _AssignmentDropdown extends StatelessWidget {
  final Lead lead;
  const _AssignmentDropdown({required this.lead});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final leadsProvider = context.read<LeadsProvider>();

    // Build map of user ID → display name
    final Map<String, String> userMap = {};

    // Add current user
    if (authProvider.currentUser != null) {
      final currentUser = authProvider.currentUser!;
      userMap[currentUser.id] = currentUser.name.isNotEmpty
          ? currentUser.name
          : currentUser.id;
    }

    // Add team members
    if (authProvider.currentUserTeam != null) {
      for (final member in authProvider.currentUserTeam!.members) {
        final displayName =
            member.user?.name ?? member.user?.email ?? member.userId;
        userMap[member.userId] = displayName;
      }
    }

    // If currently assigned user not in list, add them
    if (!userMap.containsKey(lead.assignedTo.userId) &&
        lead.assignedTo.userId.isNotEmpty) {
      userMap[lead.assignedTo.userId] = lead.assignedTo.userId;
    }

    if (userMap.isEmpty) {
      return const SizedBox.shrink();
    }

    // Build dropdown items
    final items = userMap.entries.map((entry) {
      return DropdownMenuItem<String>(
        value: entry.key,
        child: Text(entry.value, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    }).toList();

    return DropdownButtonHideUnderline(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: DropdownButton<String>(
          value: lead.assignedTo.userId.isEmpty ? null : lead.assignedTo.userId,
          icon: const Icon(
            Icons.arrow_drop_down_rounded,
            size: 20,
            color: AppTheme.onSurfaceMuted,
          ),
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.onSurface,
          ),
          isDense: true,
          isExpanded: false,
          onChanged: (v) {
            if (v != null) {
              leadsProvider.assignLead(lead.id, v);
            }
          },
          items: items,
        ),
      ),
    );
  }
}

class _CompactFollowupEmpty extends StatelessWidget {
  final VoidCallback onAdd;
  const _CompactFollowupEmpty({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onAdd,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.add_rounded,
            size: 13,
            color: AppTheme.onSurfaceMuted,
          ),
          const SizedBox(width: 4),
          Text(
            'Schedule followup',
            style: TextStyle(fontSize: 11, color: AppTheme.onSurfaceMuted),
          ),
        ],
      ),
    );
  }
}

class _FollowupsSection extends StatelessWidget {
  final Lead lead;
  final String leadId;
  final String filter;
  final ValueChanged<String> onFilterChanged;
  final VoidCallback onDeleteFollowup;
  final ApiService apiService;
  final VoidCallback onFollowupSuccess;
  final bool isRefreshing;
  final String? initialFollowupType;

  const _FollowupsSection({
    required this.lead,
    required this.leadId,
    required this.filter,
    required this.onFilterChanged,
    required this.onDeleteFollowup,
    required this.apiService,
    required this.onFollowupSuccess,
    required this.isRefreshing,
    this.initialFollowupType,
  });

  @override
  Widget build(BuildContext context) {
    final hasFollowup =
        lead.nextFollowupDateTime != null &&
        lead.nextFollowupDateTime!.isNotEmpty;

    if (!hasFollowup) {
      return _CompactFollowupEmpty(
        onAdd: () => _showAddFollowupSheet(context, lead.id),
      );
    }

    try {
      final scheduledFor = DateTime.parse(lead.nextFollowupDateTime!);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final followupDay = DateTime(
        scheduledFor.year,
        scheduledFor.month,
        scheduledFor.day,
      );
      final isOverdue = scheduledFor.isBefore(now);
      final isToday = followupDay == today;

      final badgeColor = isOverdue
          ? Colors.red
          : isToday
          ? Colors.orange
          : AppTheme.primary;
      final badgeLabel = isOverdue
          ? 'OVERDUE'
          : isToday
          ? 'TODAY'
          : 'SCHEDULED';

      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tappable content area (opens update sheet)
            Expanded(
              child: GestureDetector(
                onTap: () => _showAddFollowupSheet(context, lead.id),
                behavior: HitTestBehavior.opaque,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status dot
                    Padding(
                      padding: const EdgeInsets.only(top: 4, right: 7),
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: badgeColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    // Note next to dot
                    Expanded(
                      child: Text(
                        lead.followupNotes != null &&
                                lead.followupNotes!.isNotEmpty
                            ? lead.followupNotes!
                            : '—',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.onSurface,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Date + badge stacked on the right
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          DateFormat('d MMM, h:mm a').format(scheduledFor),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isOverdue
                                ? Colors.red.shade700
                                : AppTheme.onSurfaceMuted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: badgeColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            badgeLabel,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: badgeColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 4),
            // Delete action — outside GestureDetector so it receives its own taps
            InkWell(
              onTap: () => _deleteFollowup(context, lead.id),
              borderRadius: BorderRadius.circular(4),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Icon(Icons.close_rounded, size: 13, color: Colors.red),
              ),
            ),
          ],
        ),
      );
    } catch (_) {
      return const SizedBox.shrink();
    }
  }

  void _deleteFollowup(BuildContext context, String leadId) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Followup?'),
        content: const Text('This will remove the scheduled followup.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<LeadsProvider>().removeFollowup(leadId);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showAddFollowupSheet(BuildContext context, String leadId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => QuickFollowupForm(leadId: leadId),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: AppTheme.onSurfaceMuted,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final Activity activity;
  const _ActivityTile({required this.activity});

  Color _getActivityColor(String type) {
    switch (type.toLowerCase()) {
      case 'call':
      case 'call_logged':
        return const Color(0xFF039BE5); // sky blue
      case 'whatsapp_sent':
        return const Color(0xFF00C853); // bright green
      case 'note':
      case 'note_added':
        return const Color(0xFF3D5AFE); // electric indigo
      case 'followup':
      case 'followup_scheduled':
        return const Color(0xFF00BCD4); // cyan
      case 'lead_stage_changed':
      case 'stage_changed':
      case 'pipeline_updated':
        return const Color(0xFFE91E63); // pink
      case 'call_status_changed':
      case 'lead_call_status_changed':
      case 'call_status_updated':
        return const Color(0xFF7C4DFF); // bright purple
      case 'lead_assigned':
        return const Color(0xFFFFB300); // amber
      case 'lead_created':
        return const Color(0xFF26C6DA); // teal cyan
      case 'form_submitted':
        return const Color(0xFFFF5722); // vivid orange-red
      default:
        return const Color(0xFF78909C); // blue grey
    }
  }

  String _formatType(String type) {
    switch (type.toLowerCase()) {
      case 'lead_stage_changed':
        return 'Stage';
      case 'call_status_changed':
      case 'lead_call_status_changed':
        return 'Call Status';
      case 'call_logged':
        return 'Call';
      case 'whatsapp_sent':
        return 'WhatsApp';
      case 'note_added':
        return 'Note';
      case 'followup_scheduled':
        return 'Followup';
      case 'lead_assigned':
        return 'Assigned';
      case 'lead_created':
        return 'Created';
      case 'form_submitted':
        return 'Form';
      default:
        return type
            .replaceAll('_', ' ')
            .split(' ')
            .map((w) => w.isEmpty ? '' : w[0].toUpperCase() + w.substring(1))
            .join(' ');
    }
  }

  String? _formatCallStatus(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    return raw
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }

  String _formatNote(String type, String note, Map<String, dynamic>? metadata) {
    switch (type.toLowerCase()) {
      case 'lead_stage_changed':
        final from = metadata?['old_stage_name'] as String?;
        final to = metadata?['new_stage_name'] as String?;
        if (from != null && to != null) return '$from → $to';
        if (to != null) return '→ $to';
        final match = RegExp(
          r'Stage changed to (.+)',
          caseSensitive: false,
        ).firstMatch(note);
        return match != null ? '→ ${match.group(1)}' : note;
      case 'call_status_changed':
      case 'lead_call_status_changed':
        final fromCs = _formatCallStatus(
          metadata?['old_call_status'] as String?,
        );
        final toCs = _formatCallStatus(metadata?['new_call_status'] as String?);
        if (fromCs != null && toCs != null) return '$fromCs → $toCs';
        if (toCs != null) return '→ $toCs';
        final match = RegExp(
          r'(?:updated to|to):\s*(.+)',
          caseSensitive: false,
        ).firstMatch(note);
        return match != null ? match.group(1)! : note;
      default:
        return note;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getActivityColor(activity.type);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 5),
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      _formatType(activity.type),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: color,
                      ),
                    ),
                    if (activity.userName != null &&
                        activity.userName!.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Text(
                        'by ${activity.userName}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTheme.onSurfaceMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                    if (activity.outcome != null) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          activity.outcome!,
                          style: TextStyle(
                            fontSize: 10,
                            color: color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    Text(
                      DateFormat('d MMM, h:mm a').format(activity.createdAt),
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppTheme.onSurfaceMuted,
                      ),
                    ),
                  ],
                ),
                if (activity.note.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      _formatNote(
                        activity.type,
                        activity.note,
                        activity.metadata,
                      ),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.onSurface,
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  final String title;
  final List<Widget> items;

  const _InfoSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppTheme.onSurfaceMuted,
                letterSpacing: 0.6,
              ),
            ),
          ),
          const Divider(height: 1),
          ...items,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 15, color: AppTheme.onSurfaceMuted),
          const SizedBox(width: 10),
          if (label.isNotEmpty) ...[
            SizedBox(
              width: 90,
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.onSurfaceMuted,
                ),
              ),
            ),
          ],
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppTheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityFilters extends StatelessWidget {
  final String selectedFilter;
  final Function(String) onFilterChanged;

  const _ActivityFilters({
    required this.selectedFilter,
    required this.onFilterChanged,
  });

  @override
  Widget build(BuildContext context) {
    final filters = [
      ('all', 'All', Icons.list_outlined),
      ('call', 'Calls', Icons.call_outlined),
      ('whatsapp', 'Messages', Icons.message_outlined),
      ('note', 'Notes', Icons.note_outlined),
      ('followup', 'Followups', Icons.schedule_outlined),
    ];

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final (value, label, icon) = filters[i];
          final isSelected = selectedFilter == value;
          return GestureDetector(
            onTap: () => onFilterChanged(value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primary : AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? AppTheme.primary : AppTheme.divider,
                  width: 1,
                ),
              ),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 14,
                      color: isSelected
                          ? Colors.white
                          : AppTheme.onSurfaceMuted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w500,
                        color: isSelected
                            ? Colors.white
                            : AppTheme.onSurfaceMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _NotesSection extends StatefulWidget {
  final String leadId;
  final List<Note> notes;
  final bool loadingNotes;
  final bool showAddNoteForm;
  final bool isEditing;
  final bool isListening;
  final TextEditingController noteController;
  final VoidCallback onToggleForm;
  final VoidCallback onAddNote;
  final VoidCallback onToggleSpeech;
  final Function(Note) onEditNote;
  final Function(Note) onDeleteNote;

  const _NotesSection({
    required this.leadId,
    required this.notes,
    required this.loadingNotes,
    required this.showAddNoteForm,
    required this.isEditing,
    required this.isListening,
    required this.noteController,
    required this.onToggleForm,
    required this.onAddNote,
    required this.onToggleSpeech,
    required this.onEditNote,
    required this.onDeleteNote,
  });

  @override
  State<_NotesSection> createState() => _NotesSectionState();
}

class _NotesSectionState extends State<_NotesSection> {
  String? _selectedNoteId;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                const Icon(
                  Icons.note_outlined,
                  size: 16,
                  color: AppTheme.onSurface,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'NOTES',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.onSurface,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: widget.onToggleForm,
                  icon: Icon(
                    widget.showAddNoteForm ? Icons.close : Icons.add,
                    size: 18,
                    color: AppTheme.onSurface,
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 36,
                    minHeight: 36,
                  ),
                ),
              ],
            ),
          ),
          // Add Note Form
          if (widget.showAddNoteForm) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Column(
                children: [
                  TextField(
                    controller: widget.noteController,
                    decoration: InputDecoration(
                      hintText: widget.isEditing
                          ? 'Edit your note...'
                          : 'Write a note...',
                      hintStyle: const TextStyle(
                        color: AppTheme.onSurfaceMuted,
                      ),
                      suffixIcon: Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: IconButton(
                          onPressed: widget.onToggleSpeech,
                          icon: Icon(
                            widget.isListening
                                ? Icons.mic
                                : Icons.mic_none_outlined,
                            size: 18,
                            color: widget.isListening
                                ? AppTheme.primary
                                : AppTheme.onSurfaceMuted,
                          ),
                          tooltip: widget.isListening
                              ? 'Stop listening'
                              : 'Start speaking',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(
                            minWidth: 36,
                            minHeight: 36,
                          ),
                        ),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: widget.isListening
                              ? Colors.red.shade400
                              : AppTheme.divider,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: widget.isListening
                              ? Colors.red
                              : AppTheme.primary,
                          width: widget.isListening ? 2 : 1,
                        ),
                      ),
                      fillColor: widget.isListening ? Colors.red.shade50 : null,
                      filled: widget.isListening,
                      contentPadding: const EdgeInsets.all(10),
                    ),
                    maxLines: 3,
                    minLines: 2,
                  ),
                  if (widget.isListening)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Icon(Icons.mic, size: 14, color: Colors.red),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Listening...',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.red.shade600,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: widget.onToggleForm,
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: widget.onAddNote,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                        ),
                        child: Text(
                          widget.isEditing ? 'Update' : 'Save',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
          // Notes List
          if (widget.loadingNotes)
            const Padding(
              padding: EdgeInsets.all(10),
              child: SizedBox(
                height: 40,
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
            )
          else if (widget.notes.isEmpty)
            Padding(
              padding: const EdgeInsets.all(10),
              child: Text(
                'No notes yet',
                style: TextStyle(
                  fontSize: 13,
                  color: AppTheme.onSurfaceMuted,
                  fontStyle: FontStyle.italic,
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Column(
                children: widget.notes.asMap().entries.map((entry) {
                  final note = entry.value;
                  final isLast = entry.key == widget.notes.length - 1;
                  final isSelected = _selectedNoteId == note.id;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedNoteId = isSelected ? null : note.id;
                          });
                        },
                        behavior: HitTestBehavior.opaque,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  note.content,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.onSurface,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  if (isSelected)
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          onPressed: () {
                                            widget.onEditNote(note);
                                          },
                                          icon: const Icon(
                                            Icons.edit_rounded,
                                            size: 16,
                                          ),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(
                                            minWidth: 24,
                                            minHeight: 24,
                                          ),
                                        ),
                                        IconButton(
                                          onPressed: () {
                                            widget.onDeleteNote(note);
                                          },
                                          icon: const Icon(
                                            Icons.close_rounded,
                                            size: 16,
                                            color: Colors.red,
                                          ),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(
                                            minWidth: 24,
                                            minHeight: 24,
                                          ),
                                        ),
                                      ],
                                    ),
                                  const SizedBox(height: 1),
                                  Text(
                                    DateFormat(
                                      'MMM d, h:mm a',
                                    ).format(note.createdAt),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppTheme.onSurfaceMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (!isLast) const SizedBox(height: 0),
                    ],
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _StageFormAccordion extends StatefulWidget {
  final Stage stage;
  final bool isCurrentStage;
  final bool isExpanded;
  final ValueChanged<bool> onToggle;
  final List<StageForm> forms;
  final Future<List<StageForm>> Function() onLoadForms;

  const _StageFormAccordion({
    required this.stage,
    required this.isCurrentStage,
    required this.isExpanded,
    required this.onToggle,
    required this.forms,
    required this.onLoadForms,
  });

  @override
  State<_StageFormAccordion> createState() => _StageFormAccordionState();
}

class _StageFormAccordionState extends State<_StageFormAccordion>
    with SingleTickerProviderStateMixin {
  bool _loadingForms = false;
  late AnimationController _expandController;
  late Animation<double> _iconRotation;

  @override
  void initState() {
    super.initState();
    _expandController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _iconRotation = Tween<double>(begin: 0, end: 0.5).animate(
      CurvedAnimation(parent: _expandController, curve: Curves.easeInOut),
    );
    if (widget.isExpanded) {
      _expandController.forward();
    }
  }

  @override
  void didUpdateWidget(covariant _StageFormAccordion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isExpanded && !oldWidget.isExpanded) {
      _expandController.forward();
    } else if (!widget.isExpanded && oldWidget.isExpanded) {
      _expandController.reverse();
    }
  }

  @override
  void dispose() {
    _expandController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: widget.isCurrentStage ? AppTheme.primary : AppTheme.divider,
          width: widget.isCurrentStage ? 1.5 : 1,
        ),
        boxShadow: widget.isExpanded
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: () async {
              if (!widget.isExpanded &&
                  widget.forms.isEmpty &&
                  !_loadingForms) {
                setState(() => _loadingForms = true);
                await widget.onLoadForms();
                setState(() => _loadingForms = false);
              }
              widget.onToggle(!widget.isExpanded);
            },
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Stage indicator dot
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: widget.isCurrentStage
                          ? AppTheme.primary
                          : Colors.transparent,
                      border: Border.all(
                        color: Color(
                          int.parse(
                            widget.stage.color.replaceFirst('#', '0xff'),
                          ),
                        ),
                        width: 2,
                      ),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Stage name
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.stage.name,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: widget.isCurrentStage
                                ? FontWeight.w600
                                : FontWeight.w500,
                            color: AppTheme.onSurface,
                          ),
                        ),
                        if (widget.isCurrentStage)
                          const Padding(
                            padding: EdgeInsets.only(top: 2),
                            child: Text(
                              'Current',
                              style: TextStyle(
                                fontSize: 10,
                                color: AppTheme.primary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Form count and expand icon
                  if (widget.forms.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${widget.forms.length} form${widget.forms.length != 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTheme.onSurfaceMuted,
                        ),
                      ),
                    ),
                  const SizedBox(width: 8),
                  // Animated expand/collapse icon
                  RotationTransition(
                    turns: _iconRotation,
                    child: Icon(
                      Icons.expand_more,
                      size: 20,
                      color: AppTheme.onSurfaceMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Expanded content with smooth animations
          if (widget.isExpanded) ...[
            const Divider(height: 1, color: AppTheme.divider),
            Padding(
              padding: const EdgeInsets.all(12),
              child: AnimatedCrossFade(
                firstChild: const SizedBox(
                  height: 40,
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                secondChild: widget.forms.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          'No forms for this stage',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.onSurfaceMuted,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: widget.forms.map((form) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: AppTheme.divider,
                                  width: 0.5,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Form #${form.formId.substring(0, 8)}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                            color: AppTheme.onSurface,
                                          ),
                                        ),
                                        if (form.isRequired)
                                          const Padding(
                                            padding: EdgeInsets.only(top: 2),
                                            child: Text(
                                              'Required',
                                              style: TextStyle(
                                                fontSize: 10,
                                                color: Colors.orange,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => _showFormSubmissionDialog(
                                      context,
                                      form,
                                      widget.stage,
                                    ),
                                    child: const Text(
                                      'Open',
                                      style: TextStyle(fontSize: 11),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                crossFadeState: _loadingForms
                    ? CrossFadeState.showFirst
                    : CrossFadeState.showSecond,
                duration: const Duration(milliseconds: 200),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showFormSubmissionDialog(
    BuildContext context,
    StageForm form,
    Stage stage,
  ) {
    showDialog(
      context: context,
      builder: (_) => _FormSubmissionDialog(form: form, stage: stage),
    );
  }
}

/// Custom Fields Section Widget
class _CustomFieldsSection extends StatelessWidget {
  final Map<String, dynamic> customFields;
  final String? createdByUserName;
  final String? createdByUserId;
  final String? source;

  const _CustomFieldsSection({
    required this.customFields,
    this.createdByUserName,
    this.createdByUserId,
    this.source,
  });

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];

    // Add Created by field
    if (createdByUserId != null && createdByUserId!.isNotEmpty) {
      items.add(
        _InfoRow(
          Icons.person_add_outlined,
          'Created by',
          createdByUserName ?? createdByUserId ?? 'Unknown',
        ),
      );
    }

    // Add Source field
    if (source != null && source!.isNotEmpty) {
      items.add(
        _InfoRow(
          Icons.source_outlined,
          'Source',
          source!,
        ),
      );
    }

    // Add custom fields
    items.addAll(
      customFields.entries.map(
        (entry) => _InfoRow(
          Icons.label_outlined,
          entry.key,
          entry.value?.toString() ?? 'N/A',
        ),
      ),
    );

    return _InfoSection(
      title: 'ADDITIONAL INFO',
      items: items,
    );
  }
}

/// Form Submission Dialog
class _FormSubmissionDialog extends StatefulWidget {
  final StageForm form;
  final Stage stage;

  const _FormSubmissionDialog({required this.form, required this.stage});

  @override
  State<_FormSubmissionDialog> createState() => _FormSubmissionDialogState();
}

class _FormSubmissionDialogState extends State<_FormSubmissionDialog> {
  FormModel? _fullForm;
  bool _loading = true;
  bool _submitting = false;
  late Map<String, TextEditingController> _fieldControllers;

  @override
  void initState() {
    super.initState();
    _fieldControllers = {};
    _loadForm();
  }

  Future<void> _loadForm() async {
    try {
      final apiService = ApiService();
      final form = await apiService.getForm(widget.form.formId);
      setState(() {
        _fullForm = form;
        _loading = false;
        // Initialize controllers for each field
        for (final field in form.fields) {
          _fieldControllers[field.id] = TextEditingController();
        }
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading form: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _submitForm() async {
    // Validate required fields
    if (_fullForm != null) {
      for (final field in _fullForm!.fields) {
        if (field.isRequired && _fieldControllers[field.id]!.text.isEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('${field.label} is required')));
          return;
        }
      }
    }

    setState(() => _submitting = true);
    try {
      final apiService = ApiService();
      final authProvider = context.read<AuthProvider>();

      // Build fields map
      final fieldsData = <String, dynamic>{};
      _fieldControllers.forEach((fieldId, controller) {
        fieldsData[fieldId] = controller.text;
      });

      await apiService.submitLeadForm(
        leadId: authProvider.currentUser?.id ?? 'unknown',
        stageId: widget.stage.id,
        formId: widget.form.formId,
        fields: fieldsData,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Form submitted successfully')),
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
        setState(() => _submitting = false);
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _fieldControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              border: Border(bottom: BorderSide(color: AppTheme.divider)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.stage.name} - Form',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Form ID: ${widget.form.formId.substring(0, 8)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.onSurfaceMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _submitting ? null : () => Navigator.pop(context),
                  tooltip: 'Close',
                ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _fullForm == null
                ? const Center(child: Text('Failed to load form'))
                : _fullForm!.fields.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('No fields in this form'),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ..._fullForm!.fields.map((field) {
                          final controller = _fieldControllers[field.id]!;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      field.label,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: AppTheme.onSurface,
                                      ),
                                    ),
                                    if (field.isRequired)
                                      const Padding(
                                        padding: EdgeInsets.only(left: 4),
                                        child: Text(
                                          '*',
                                          style: TextStyle(
                                            color: Colors.red,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                // Render field based on type
                                if (field.fieldType == 'textarea')
                                  TextField(
                                    controller: controller,
                                    maxLines: 4,
                                    minLines: 2,
                                    enabled: !_submitting,
                                    decoration: InputDecoration(
                                      hintText:
                                          field.placeholder ??
                                          'Enter ${field.label.toLowerCase()}',
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.all(12),
                                    ),
                                  )
                                else if (field.fieldType == 'select')
                                  DropdownButtonFormField<String>(
                                    value: controller.text.isEmpty
                                        ? null
                                        : controller.text,
                                    onChanged: _submitting
                                        ? null
                                        : (value) {
                                            controller.text = value ?? '';
                                          },
                                    items: (field.options ?? [])
                                        .map(
                                          (option) => DropdownMenuItem(
                                            value: option,
                                            child: Text(option),
                                          ),
                                        )
                                        .toList(),
                                    decoration: InputDecoration(
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.all(12),
                                    ),
                                  )
                                else if (field.fieldType == 'checkbox')
                                  CheckboxListTile(
                                    value: controller.text == 'true',
                                    onChanged: _submitting
                                        ? null
                                        : (value) {
                                            controller.text = (value ?? false)
                                                .toString();
                                          },
                                    title: const SizedBox.shrink(),
                                    contentPadding: EdgeInsets.zero,
                                  )
                                else
                                  TextField(
                                    controller: controller,
                                    enabled: !_submitting,
                                    keyboardType: field.fieldType == 'email'
                                        ? TextInputType.emailAddress
                                        : field.fieldType == 'number'
                                        ? TextInputType.number
                                        : TextInputType.text,
                                    decoration: InputDecoration(
                                      hintText:
                                          field.placeholder ??
                                          'Enter ${field.label.toLowerCase()}',
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.all(12),
                                    ),
                                  ),
                                if (field.helpText != null &&
                                    field.helpText!.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      field.helpText!,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.onSurfaceMuted,
                                        fontStyle: FontStyle.italic,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        }).toList(),
                        if (widget.form.isRequired)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                '⚠ This form is required',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.orange,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
          ),
          // Footer
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.divider)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _submitting ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _submitting || _loading ? null : _submitForm,
                  icon: _submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : const Icon(Icons.check),
                  label: Text(_submitting ? 'Submitting...' : 'Submit'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

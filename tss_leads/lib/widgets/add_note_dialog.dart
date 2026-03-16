import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../theme/app_theme.dart';

class AddNoteDialog extends StatefulWidget {
  final Function(String) onSave;

  const AddNoteDialog({required this.onSave, Key? key}) : super(key: key);

  @override
  State<AddNoteDialog> createState() => _AddNoteDialogState();
}

class _AddNoteDialogState extends State<AddNoteDialog> {
  late TextEditingController _noteController;
  final stt.SpeechToText _speechToText = stt.SpeechToText();
  bool _isListening = false;
  String _ongoingSpeech = '';

  @override
  void initState() {
    super.initState();
    _noteController = TextEditingController();
    _initSpeechToText();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _initSpeechToText() async {
    await _speechToText.initialize(
      onError: (error) => print('Speech error: $error'),
      onStatus: (status) => print('Speech status: $status'),
    );
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
            if (result.finalResult) {
              if (_noteController.text.isNotEmpty &&
                  !_noteController.text.endsWith(' ')) {
                _noteController.text += ' ';
              }
              _noteController.text += _ongoingSpeech;
              _isListening = false;
            }
          });
        },
      );
    } catch (e) {
      print('Error starting speech recognition: $e');
      setState(() => _isListening = false);
    }
  }

  void _stopListening() async {
    if (_isListening) {
      _speechToText.stop();
      setState(() => _isListening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Text(
              'Add Note',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),

            // Note input with mic
            TextField(
              controller: _noteController,
              decoration: InputDecoration(
                hintText: 'Write a note...',
                hintStyle: const TextStyle(color: AppTheme.onSurfaceMuted),
                suffixIcon: Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: IconButton(
                    onPressed: _toggleSpeechToText,
                    icon: Icon(
                      _isListening ? Icons.mic : Icons.mic_none_outlined,
                      size: 18,
                      color: _isListening
                          ? AppTheme.primary
                          : AppTheme.onSurfaceMuted,
                    ),
                    tooltip: _isListening ? 'Stop listening' : 'Start speaking',
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
                    color: _isListening
                        ? Colors.red.shade400
                        : AppTheme.divider,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(
                    color: _isListening ? Colors.red : AppTheme.primary,
                    width: _isListening ? 2 : 1,
                  ),
                ),
                fillColor: _isListening ? Colors.red.shade50 : null,
                filled: _isListening,
                contentPadding: const EdgeInsets.all(10),
              ),
              maxLines: 3,
              minLines: 2,
            ),

            // Listening indicator
            if (_isListening)
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

            const SizedBox(height: 16),

            // Action buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    if (_noteController.text.isNotEmpty) {
                      final noteText = _noteController.text;
                      print('📝 Dialog save button pressed with: "$noteText"');
                      widget.onSave(noteText);
                      // Note: onSave callback will handle popping the dialog
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter a note')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Save Note'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

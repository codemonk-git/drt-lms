class Note {
  final String id;
  final String content;
  final String authorName;
  final String authorId;
  final DateTime createdAt;

  const Note({
    required this.id,
    required this.content,
    required this.authorName,
    required this.authorId,
    required this.createdAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    // Get author name - try author_name first, then user_id, default to 'Unknown'
    final authorName =
        json['author_name'] as String? ??
        json['user_id'] as String? ??
        'Unknown';

    return Note(
      id: json['id'] as String? ?? '',
      content:
          json['description'] as String? ?? json['content'] as String? ?? '',
      authorName: authorName,
      authorId: json['user_id'] as String? ?? '',
      createdAt: DateTime.parse(
        json['created_at'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'content': content,
    'author_name': authorName,
    'user_id': authorId,
    'created_at': createdAt.toIso8601String(),
  };
}

enum CalendarItemType { reflection, wheelReview, reminder }

class CalendarItem {
  final String id;
  final DateTime dateTime;
  final String title;
  final CalendarItemType type;
  final String? wheelId;
  final String? rayId;
  final String? intention;
  final String? reason;
  final String? originalThought;
  final double? originalScore;
  final bool completed;

  const CalendarItem({
    required this.id, required this.dateTime, required this.title,
    required this.type, this.wheelId, this.rayId, this.intention,
    this.reason, this.originalThought, this.originalScore, this.completed = false,
  });

  Map<String,dynamic> toJson() => {
    'id': id, 'dateTime': dateTime.toIso8601String(), 'title': title,
    'type': type.name, 'wheelId': wheelId, 'rayId': rayId,
    'intention': intention, 'reason': reason,
    'originalThought': originalThought, 'originalScore': originalScore,
    'completed': completed,
  };

  factory CalendarItem.fromJson(Map<String,dynamic> j) => CalendarItem(
    id: j['id'] as String,
    dateTime: DateTime.parse(j['dateTime'] as String),
    title: j['title'] as String,
    type: CalendarItemType.values.firstWhere(
      (v) => v.name == j['type'],
      orElse: () => CalendarItemType.reflection,
    ),
    wheelId: j['wheelId'] as String?,
    rayId: j['rayId'] as String?,
    intention: j['intention'] as String?,
    reason: j['reason'] as String?,
    originalThought: j['originalThought'] as String?,
    originalScore: (j['originalScore'] as num?)?.toDouble(),
    completed: j['completed'] as bool? ?? false,
  );
}

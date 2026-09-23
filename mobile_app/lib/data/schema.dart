class Schema {
  static const current = 6;

  static Map<String,dynamic> migrate(Map<String,dynamic> input) {
    final data = Map<String,dynamic>.from(input);
    final version = (data['schemaVersion'] as int?) ?? 1;
    if (version > current) {
      throw const FormatException('Backup schema is newer than this app');
    }
    if (version < 2) {
      data['settings'] ??= <String,dynamic>{};
      data['scores'] ??= <dynamic>[];
      data['journal'] ??= <dynamic>[];
      data['schemaVersion'] = 2;
    }
    if (version < 3) {
      data['calendar'] ??= <dynamic>[];
      data['schemaVersion'] = 3;
    }
    if (version < 4) {
      final calendar = (data['calendar'] as List?) ?? <dynamic>[];
      data['calendar'] = calendar.map((entry) {
        final item = Map<String,dynamic>.from(entry as Map);
        item['intention'] ??= null;
        item['reason'] ??= null;
        item['originalThought'] ??= null;
        item['originalScore'] ??= null;
        return item;
      }).toList();
      data['schemaVersion'] = 4;
    }
    if (version < 5) {
      data['mood'] ??= <dynamic>[];
      data['schemaVersion'] = 5;
    }
    if (version < 6) {
      data['wheelNotes'] ??= <dynamic>[];
      data['schemaVersion'] = 6;
    }
    return data;
  }

  static void validate(Map<String,dynamic> data) {
    if (data['schemaVersion'] is! int) {
      throw const FormatException('schemaVersion is required');
    }
    for (final key in ['wheels', 'scores', 'journal', 'calendar', 'mood', 'wheelNotes']) {
      if (data[key] is! List) {
        throw FormatException('Missing $key');
      }
    }
    final wheels = data['wheels'] as List;
    final wheelIds = <String>{};
    final rayIds = <String>{};
    for (final raw in wheels) {
      final wheel = Map<String,dynamic>.from(raw as Map);
      final id = wheel['id'];
      if (id is! String || id.isEmpty || !wheelIds.add(id)) {
        throw const FormatException('Invalid or duplicate wheel id');
      }
      if (wheel['title'] is! String || (wheel['title'] as String).trim().isEmpty) {
        throw const FormatException('Wheel title is required');
      }
      if (wheel['rays'] is! List) {
        throw const FormatException('Wheel rays are required');
      }
      for (final rayRaw in wheel['rays'] as List) {
        final ray = Map<String,dynamic>.from(rayRaw as Map);
        if (ray['id'] is! String || ray['title'] is! String) {
          throw const FormatException('Invalid wheel ray');
        }
        if (!rayIds.add(ray['id'] as String)) {
          throw const FormatException('Duplicate wheel ray id');
        }
        final child = ray['childWheelId'];
        if (child != null && child is! String) {
          throw const FormatException('Invalid child wheel reference');
        }
      }
    }
    for (final raw in data['scores'] as List) {
      final score = Map<String,dynamic>.from(raw as Map);
      final value = (score['value'] as num?)?.toDouble();
      if (score['wheelId'] is! String || score['rayId'] is! String ||
          !wheelIds.contains(score['wheelId']) || !rayIds.contains(score['rayId']) ||
          value == null || value < 0 || value > 10 || score['at'] is! String) {
        throw const FormatException('Invalid wheel score');
      }
    }
    for (final raw in data['wheelNotes'] as List) {
      final note = Map<String,dynamic>.from(raw as Map);
      if (note['id'] is! String || note['wheelId'] is! String || note['rayId'] is! String ||
          !wheelIds.contains(note['wheelId']) || !rayIds.contains(note['rayId']) ||
          note['text'] is! String || note['at'] is! String) {
        throw const FormatException('Invalid wheel note');
      }
    }
    for (final raw in data['mood'] as List) {
      final mood = Map<String,dynamic>.from(raw as Map);
      final value = mood['value'];
      if (value is! int || value < 1 || value > 5) {
        throw const FormatException('Mood must be between 1 and 5');
      }
    }
  }
}
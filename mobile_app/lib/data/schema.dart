class Schema {
  static const current = 5;

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
    if (version < 5) { data['mood'] ??= <dynamic>[]; data['schemaVersion'] = 5; }
    return data;
  }

  static void validate(Map<String,dynamic> data) {
    if (data['schemaVersion'] is! int) {
      throw const FormatException('schemaVersion is required');
    }
    for (final key in ['wheels', 'scores', 'journal', 'calendar', 'mood']) {
      if (data[key] is! List) {
        throw FormatException('Missing $key');
      }
    }
    final wheels = data['wheels'] as List;
    final wheelIds = <String>{};
    for (final raw in wheels) {
      final wheel = Map<String, dynamic>.from(raw as Map);
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
        final ray = Map<String, dynamic>.from(rayRaw as Map);
        if (ray['id'] is! String || ray['title'] is! String) {
          throw const FormatException('Invalid wheel ray');
        }
        final child = ray['childWheelId'];
        if (child != null && child is! String) {
          throw const FormatException('Invalid child wheel reference');
        }
      }
    }
    for (final raw in data['scores'] as List) {
      final score = Map<String, dynamic>.from(raw as Map);
      final value = (score['value'] as num?)?.toDouble();
      if (value == null || value < 0 || value > 10) {
        throw const FormatException('Wheel score must be between 0 and 10');
      }
    }
    for (final raw in data['mood'] as List) {
      final mood = Map<String, dynamic>.from(raw as Map);
      final value = mood['value'];
      if (value is! int || value < 1 || value > 5) {
        throw const FormatException('Mood must be between 1 and 5');
      }
    }
  }
}

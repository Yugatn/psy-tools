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
  }
}

class Schema {
  static const current = 2;
  static Map<String,dynamic> migrate(Map<String,dynamic> input) {
    final data = Map<String,dynamic>.from(input);
    final version = (data['schemaVersion'] as int?) ?? 1;
    if (version > current) throw const FormatException('Backup schema is newer than this app');
    if (version < 2) {
      data['settings'] ??= <String,dynamic>{};
      data['scores'] ??= <dynamic>[];
      data['journal'] ??= <dynamic>[];
      data['schemaVersion'] = 2;
    }
    return data;
  }
  static void validate(Map<String,dynamic> data) {
    if (data['schemaVersion'] is! int) throw const FormatException('schemaVersion is required');
    for (final key in ['wheels','scores','journal']) {
      if (data[key] is! List) throw FormatException('Missing '+key);
    }
  }
}

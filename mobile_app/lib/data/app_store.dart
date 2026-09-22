import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'schema.dart';
import '../domain/models.dart';
import '../services/encryption_service.dart';

class AppStore {
  static const key = 'psy_tools_data_v2';
  static const encryptedKey = 'psy_tools_secure_data_v1';
  final EncryptionService encryption = EncryptionService();

  Map<String,dynamic> data = {
    'schemaVersion': Schema.current,
    'wheels': <Map<String,dynamic>>[],
    'scores': <Map<String,dynamic>>[],
    'journal': <Map<String,dynamic>>[],
    'calendar': <Map<String,dynamic>>[],
    'mood': <Map<String,dynamic>>[],
    'settings': <String,dynamic>{},
  };

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    final encrypted = p.getString(encryptedKey);
    if (encrypted != null) {
      final decoded = await encryption.decrypt(encrypted);
      final migrated = Schema.migrate(decoded);
      Schema.validate(migrated);
      data = migrated;
      if (migrated['schemaVersion'] != decoded['schemaVersion']) await save();
      return;
    }
    final legacy = p.getString(key);
    if (legacy == null) return;
    final migrated = Schema.migrate(Map<String,dynamic>.from(jsonDecode(legacy) as Map));
    Schema.validate(migrated);
    data = migrated;
    await save();
    await p.remove(key);
  }

  Future<void> save() async {
    data['schemaVersion'] = Schema.current;
    final encrypted = await encryption.encrypt(data);
    await (await SharedPreferences.getInstance()).setString(encryptedKey, encrypted);
  }

  List<Wheel> wheels() => ((data['wheels'] as List?) ?? <dynamic>[])
      .map((e) => Wheel.fromJson(Map<String,dynamic>.from(e as Map))).toList();

  List<MoodEntry> moods() => ((data['mood'] as List?) ?? <dynamic>[])
      .map((e) => MoodEntry.fromJson(Map<String,dynamic>.from(e as Map))).toList();

  Future<void> replaceFromBackup(Map<String,dynamic> backup) async {
    final migrated = Schema.migrate(backup);
    Schema.validate(migrated);
    data = migrated;
    await save();
  }
}

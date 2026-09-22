import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'schema.dart';
import '../domain/models.dart';

class AppStore {
  static const key = 'psy_tools_data_v2';

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
    final raw = p.getString(key);
    if (raw == null) return;
    final migrated = Schema.migrate(
      Map<String,dynamic>.from(jsonDecode(raw) as Map),
    );
    Schema.validate(migrated);
    data = migrated;
  }

  Future<void> save() async {
    data['schemaVersion'] = Schema.current;
    await (await SharedPreferences.getInstance()).setString(key, jsonEncode(data));
  }

  List<Wheel> wheels() => ((data['wheels'] as List?) ?? <dynamic>[])
      .map((e) => Wheel.fromJson(Map<String,dynamic>.from(e as Map)))
      .toList();

  List<MoodEntry> moods() => ((data['mood'] as List?) ?? <dynamic>[]).map((e) => MoodEntry.fromJson(Map<String,dynamic>.from(e as Map))).toList();

  Future<void> replaceFromBackup(Map<String,dynamic> backup) async {
    final migrated = Schema.migrate(backup);
    Schema.validate(migrated);
    data = migrated;
    await save();
  }
}

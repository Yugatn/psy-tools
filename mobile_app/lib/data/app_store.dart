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
    if (legacy == null) {
      _seedDefaultWheels();
      await save();
      return;
    }
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

  List<WheelScore> scores() => ((data['scores'] as List?) ?? const [])
      .map((e) => WheelScore.fromJson(Map<String,dynamic>.from(e as Map))).toList();

  List<MoodEntry> moods() => ((data['mood'] as List?) ?? <dynamic>[])
      .map((e) => MoodEntry.fromJson(Map<String,dynamic>.from(e as Map))).toList();

  void _seedDefaultWheels() {
    final wheels = data['wheels'] as List;
    if (wheels.isNotEmpty) return;
    final templates = <Map<String, List<String>>>{
      'Жизнь': ['Здоровье', 'Работа', 'Отношения', 'Финансы', 'Отдых', 'Развитие', 'Среда жизни', 'Смысл и ценности'],
      'Здоровье и активность': ['Питание', 'Сон', 'Отдых', 'Физическая активность', 'Энергия', 'Самочувствие', 'Профилактика', 'Восстановление'],
      'Работа и профессиональная деятельность': ['Коллеги', 'Зарплата', 'Рабочее время', 'Руководство', 'Задачи', 'Развитие навыков', 'Карьерные перспективы', 'Баланс работы и жизни'],
      'Отношения': ['Партнёрство', 'Семья', 'Друзья', 'Общение', 'Поддержка', 'Близость', 'Границы', 'Совместный отдых'],
    };
    final created = <String, String>{};
    var wheelIndex = 0;
    for (final entry in templates.entries) {
      final wheelId = 'wheel_default_${wheelIndex++}';
      created[entry.key] = wheelId;
      wheels.add({
        'id': wheelId,
        'title': entry.key,
        'parentId': null,
        'rays': [
          for (var i = 0; i < entry.value.length; i++)
            {'id': '${wheelId}_ray_$i', 'title': entry.value[i], 'childWheelId': null},
        ],
      });
    }
    final life = wheels.firstWhere((w) => w['id'] == created['Жизнь']) as Map<String,dynamic>;
    final link = <String,String>{
      'Здоровье': created['Здоровье и активность']!,
      'Работа': created['Работа и профессиональная деятельность']!,
      'Отношения': created['Отношения']!,
    };
    final rays = (life['rays'] as List).cast<Map<String,dynamic>>();
    for (final ray in rays) {
      final child = link[ray['title']];
      if (child != null) ray['childWheelId'] = child;
    }
  }

  Future<void> replaceFromBackup(Map<String,dynamic> backup) async {
    final migrated = Schema.migrate(backup);
    Schema.validate(migrated);
    data = migrated;
    await save();
  }
}

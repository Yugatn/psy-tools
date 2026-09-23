import 'dart:convert';
import '../data/app_store.dart';
import '../data/schema.dart';
class BackupService {
  final AppStore store;
  BackupService(this.store);
  String exportJson({String appVersion='0.1.0'}) { final copy=Map<String,dynamic>.from(store.data); copy['schemaVersion']=Schema.current; copy['appVersion']=appVersion; copy['exportedAt']=DateTime.now().toUtc().toIso8601String(); return const JsonEncoder.withIndent('  ').convert(copy); }
  Map<String,dynamic> validate(String raw) { final decoded=jsonDecode(raw); if(decoded is! Map<String,dynamic>){throw const FormatException('Backup root must be an object');} final migrated=Schema.migrate(decoded); Schema.validate(migrated); return migrated; }
}

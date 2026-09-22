import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'schema.dart';
import '../domain/models.dart';
class AppStore {
  static const key = 'psy_tools_data_v2';
  Map<String,dynamic> data = {'schemaVersion':Schema.current,'wheels':<Map<String,dynamic>>[],'scores':<Map<String,dynamic>>[],'journal':<Map<String,dynamic>>[],'settings':<String,dynamic>{}};
  Future<void> load() async { final p=await SharedPreferences.getInstance(); final raw=p.getString(key); if(raw==null)return; final decoded=jsonDecode(raw); if(decoded is! Map<String,dynamic>)throw const FormatException('Stored PSY-TOOLS data is invalid'); data=Schema.migrate(decoded); Schema.validate(data); }
  Future<void> save() async { final p=await SharedPreferences.getInstance(); await p.setString(key,jsonEncode(data)); }
  List<Wheel> wheels()=>((data['wheels'] as List?)??[]).map((e)=>Wheel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  Future<void> replaceFromBackup(Map<String,dynamic> backup) async { final migrated=Schema.migrate(backup); Schema.validate(migrated); data=migrated; await save(); }
}

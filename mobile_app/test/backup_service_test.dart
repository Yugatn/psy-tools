import 'package:flutter_test/flutter_test.dart';
import 'package:psy_tools_mobile/data/app_store.dart';
import 'package:psy_tools_mobile/services/backup_service.dart';
void main(){test('backup export validates',(){final b=BackupService(AppStore());expect(b.validate(b.exportJson())['schemaVersion'],1);});test('invalid backup rejected',(){expect(()=>BackupService(AppStore()).validate('{}'),throwsFormatException);});}

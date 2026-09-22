import 'package:flutter_test/flutter_test.dart';
import 'package:psy_tools_mobile/data/schema.dart';
void main(){
  test('migrates v1 backup',(){final data=Schema.migrate({'schemaVersion':1,'wheels':[]});expect(data['schemaVersion'],Schema.current);expect(data['journal'],isA<List>());});
  test('rejects future schema',(){expect(()=>Schema.migrate({'schemaVersion':999,'wheels':[]}),throwsFormatException);});
}

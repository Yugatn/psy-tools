import 'package:flutter_test/flutter_test.dart';
import 'package:psy_tools_mobile/domain/models.dart';
import 'package:psy_tools_mobile/services/wheel_graph_service.dart';
void main(){test('detects recursive wheel cycle',(){final a=Wheel(id:'a',title:'A',rays:[const WheelRay(id:'r',title:'R',childWheelId:'b')]);final b=Wheel(id:'b',title:'B',rays:[const WheelRay(id:'r2',title:'R2',childWheelId:'a')]);expect(WheelGraphService().hasCycle('a',{'a':a,'b':b}),true);});}

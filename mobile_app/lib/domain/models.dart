class Wheel {
  final String id,title; final String? parentId; final List<WheelRay> rays;
  const Wheel({required this.id,required this.title,this.parentId,required this.rays});
  Map<String,dynamic> toJson()=>{'id':id,'title':title,'parentId':parentId,'rays':rays.map((e)=>e.toJson()).toList()};
  factory Wheel.fromJson(Map<String,dynamic> j)=>Wheel(id:j['id'] as String,title:j['title'] as String,parentId:j['parentId'] as String?,rays:(j['rays'] as List).map((e)=>WheelRay.fromJson(Map<String,dynamic>.from(e as Map))).toList());
}
class WheelRay {
  final String id,title; final String? childWheelId;
  const WheelRay({required this.id,required this.title,this.childWheelId});
  Map<String,dynamic> toJson()=>{'id':id,'title':title,'childWheelId':childWheelId};
  factory WheelRay.fromJson(Map<String,dynamic> j)=>WheelRay(id:j['id'] as String,title:j['title'] as String,childWheelId:j['childWheelId'] as String?);
}
class WheelScore {
  final String wheelId,rayId; final double value; final DateTime at;
  const WheelScore({required this.wheelId,required this.rayId,required this.value,required this.at});
  Map<String,dynamic> toJson()=>{'wheelId':wheelId,'rayId':rayId,'value':value,'at':at.toIso8601String()};
  factory WheelScore.fromJson(Map<String,dynamic> j)=>WheelScore(
    wheelId:j['wheelId'] as String,
    rayId:j['rayId'] as String,
    value:(j['value'] as num).toDouble(),
    at:DateTime.parse(j['at'] as String),
  );
}
class MoodEntry {
  final int value; final DateTime at; final String? note;
  const MoodEntry({required this.value,required this.at,this.note});
  Map<String,dynamic> toJson()=>{'value':value,'at':at.toIso8601String(),'note':note};
  factory MoodEntry.fromJson(Map<String,dynamic> j)=>MoodEntry(value:(j['value'] as num).toInt(),at:DateTime.parse(j['at'] as String),note:j['note'] as String?);
}
class JournalEntry {
  final String id,text; final DateTime createdAt; final List<String> wheelIds,rayIds;
  const JournalEntry({required this.id,required this.text,required this.createdAt,this.wheelIds=const[],this.rayIds=const[]});
  Map<String,dynamic> toJson()=>{'id':id,'text':text,'createdAt':createdAt.toIso8601String(),'wheelIds':wheelIds,'rayIds':rayIds};
}

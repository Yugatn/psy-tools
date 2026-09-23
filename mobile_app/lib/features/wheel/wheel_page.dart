import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/app_store.dart';
import '../../domain/models.dart';

class WheelPage extends StatefulWidget {
  final AppStore store; final String wheelId;
  const WheelPage({super.key,required this.store,required this.wheelId});
  @override State<WheelPage> createState()=>_WheelPageState();
}

class _WheelPageState extends State<WheelPage>{
  late final DateFormat _dateFormat;
  @override void initState(){super.initState();_dateFormat=DateFormat('dd.MM.yyyy HH:mm');}

  Future<void> _saveScore(Wheel wheel,WheelRay ray,double value) async {
    final scores=(widget.store.data['scores'] as List).cast<Map<String,dynamic>>();
    scores.add(WheelScore(wheelId:wheel.id,rayId:ray.id,value:value.clamp(0,10).toDouble(),at:DateTime.now()).toJson());
    await widget.store.save();
  }

  double _currentScore(Wheel wheel,WheelRay ray){
    for(final raw in widget.store.scores().reversed){
      if(raw.wheelId==wheel.id&&raw.rayId==ray.id)return raw.value;
    }
    return 0;
  }

  WheelNote? _noteFor(Wheel wheel,WheelRay ray){
    for(final note in widget.store.wheelNotes().reversed){
      if(note.wheelId==wheel.id&&note.rayId==ray.id)return note;
    }
    return null;
  }

  Future<void> _editNote(Wheel wheel,WheelRay ray) async {
    final existing=_noteFor(wheel,ray); final controller=TextEditingController(text:existing?.text??'');
    final text=await showDialog<String>(context:context,builder:(context)=>AlertDialog(
      title:Text('Рефлексия: ${ray.title}'),
      content:TextField(controller:controller,autofocus:true,minLines:4,maxLines:8,textCapitalization:TextCapitalization.sentences,
        decoration:const InputDecoration(hintText:'Что сейчас происходит в этой сфере?',border:OutlineInputBorder())),
      actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Отмена')),
        FilledButton(onPressed:()=>Navigator.pop(context,controller.text),child:const Text('Сохранить'))],
    ));
    controller.dispose(); if(text==null)return;
    await widget.store.saveWheelNote(wheelId:wheel.id,rayId:ray.id,text:text);
    if(mounted)setState((){});
  }

  Future<void> _showHistory(Wheel wheel) async {
    final history=widget.store.scores().where((s)=>s.wheelId==wheel.id).toList()..sort((a,b)=>b.at.compareTo(a.at));
    if(!mounted)return;
    await showModalBottomSheet<void>(context:context,showDragHandle:true,builder:(context)=>SafeArea(
      child:history.isEmpty?const Padding(padding:EdgeInsets.all(24),child:Text('История появится после первой оценки.')):
      ListView.builder(padding:const EdgeInsets.fromLTRB(16,8,16,24),itemCount:history.length,itemBuilder:(_,index){
        final item=history[index]; final ray=wheel.rays.where((r)=>r.id==item.rayId).firstOrNull;
        return ListTile(leading:CircleAvatar(child:Text(item.value.toStringAsFixed(0))),title:Text(ray?.title??'Луч'),subtitle:Text(_dateFormat.format(item.at)));
      }),
    ));
  }

  Future<void> _createChildWheel(Wheel parent,WheelRay ray) async {
    final controller=TextEditingController(text:'${ray.title}: подробное колесо');
    final title=await showDialog<String>(context:context,builder:(context)=>AlertDialog(
      title:const Text('Дочернее колесо'),content:TextField(controller:controller,autofocus:true,decoration:const InputDecoration(labelText:'Название')),
      actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Отмена')),
        FilledButton(onPressed:()=>Navigator.pop(context,controller.text.trim()),child:const Text('Создать'))],
    ));
    controller.dispose(); if(title==null||title.isEmpty)return;
    final childId='wheel_${DateTime.now().microsecondsSinceEpoch}';
    final child=<String,dynamic>{'id':childId,'title':title,'parentId':parent.id,'rays':[
      for(var i=0;i<8;i++){'id':'${childId}_ray_${i','title':'Новый аспект ${i+1}','childWheelId':null}
    ]};
    (widget.store.data['wheels'] as List).add(child);
    final parentRaw=(widget.store.data['wheels'] as List).firstWhere((w)=>w['id']==parent.id);
    final rayRaw=(parentRaw['rays'] as List).firstWhere((r)=>r['id']==ray.id); rayRaw['childWheelId']=childId;
    await widget.store.save(); if(mounted)setState((){});
  }

  @override Widget build(BuildContext context){
    final wheel=widget.store.wheels().where((w)=>w.id==widget.wheelId).firstOrNull;
    if(wheel==null)return Scaffold(appBar:AppBar(title:const Text('Колесо')),body:const Center(child:Text('Колесо не найдено')));
    final scores=<String,double>{for(final ray in wheel.rays)ray.id:_currentScore(wheel,ray)};
    final average=scores.isEmpty?0:scores.values.reduce((a,b)=>a+b)/scores.length;
    return Scaffold(
      appBar:AppBar(title:Text(wheel.title),actions:[IconButton(tooltip:'История',onPressed:()=>_showHistory(wheel),icon:const Icon(Icons.history))]),
      body:ListView(padding:const EdgeInsets.fromLTRB(16,8,16,32),children:[
        Container(padding:const EdgeInsets.all(8),child:AspectRatio(aspectRatio:1,child:CustomPaint(
          painter:_WheelPainter(wheel:wheel,scores:scores,textColor:Theme.of(context).colorScheme.onSurface,accentColor:Theme.of(context).colorScheme.primary)))),
        Card(child:Padding(padding:const EdgeInsets.all(16),child:Row(children:[
          const Icon(Icons.insights),const SizedBox(width:12),Expanded(child:Text('Средняя оценка: ${average.toStringAsFixed(1)} из 10',style:Theme.of(context).textTheme.titleMedium))
        ]))),
        const SizedBox(height:8),
        Text('Оцените каждую сферу от 0 до 10',style:Theme.of(context).textTheme.titleMedium),
        Text('Это инструмент самонаблюдения, а не диагностика.',style:Theme.of(context).textTheme.bodySmall),
        const SizedBox(height:8),
        for(final ray in wheel.rays)_RayCard(ray:ray,score:scores[ray.id]??0,note:_noteFor(wheel,ray),hasChildWheel:ray.childWheelId!=null,
          onScoreChanged:(value)=>setState(()=>scores[ray.id]=value),onScoreSaved:(value)=>_saveScore(wheel,ray,value),onNote:()=>_editNote(wheel,ray),
          onChild:()=>ray.childWheelId==null?_createChildWheel(wheel,ray):Navigator.push(context,MaterialPageRoute(builder:(_)=>WheelPage(store:widget.store,wheelId:ray.childWheelId!))).then((_){if(mounted)setState((){});}))
      ]),
    );
  }
}

class _RayCard extends StatelessWidget{
  final WheelRay ray; final double score; final WheelNote? note; final bool hasChildWheel;
  final ValueChanged<double> onScoreChanged; final ValueChanged<double> onScoreSaved; final VoidCallback onNote,onChild;
  const _RayCard({required this.ray,required this.score,required this.note,required this.hasChildWheel,required this.onScoreChanged,required this.onScoreSaved,required this.onNote,required this.onChild});
  @override Widget build(BuildContext context)=>Card(margin:const EdgeInsets.only(bottom:10),child:Padding(padding:const EdgeInsets.fromLTRB(14,12,14,8),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Row(children:[Expanded(child:Text(ray.title,style:const TextStyle(fontWeight:FontWeight.w600))),Text(score.toStringAsFixed(0),style:Theme.of(context).textTheme.titleLarge)]),
    Slider(min:0,max:10,divisions:10,value:score,label:score.toStringAsFixed(0),onChanged:onScoreChanged,onChangeEnd:onScoreSaved),
    if(note!=null&&note!.text.trim().isNotEmpty)Padding(padding:const EdgeInsets.only(bottom:6),child:Text(note!.text,maxLines:2,overflow:TextOverflow.ellipsis,style:Theme.of(context).textTheme.bodySmall)),
    Wrap(spacing:4,children:[
      TextButton.icon(onPressed:onNote,icon:Icon(note==null?Icons.edit_note:Icons.notes),label:Text(note==null?'Добавить заметку':'Изменить заметку')),
      TextButton.icon(onPressed:onChild,icon:const Icon(Icons.account_tree),label:Text(hasChildWheel?'Открыть детали':'Детализировать')),
    ])
  ])));
}

class _WheelPainter extends CustomPainter{
  final Wheel wheel; final Map<String,double> scores; final Color textColor,accentColor;
  _WheelPainter({required this.wheel,required this.scores,required this.textColor,required this.accentColor});
  @override void paint(Canvas canvas,Size size){
    if(wheel.rays.isEmpty)return;
    final center=size.center(Offset.zero); final radius=size.shortestSide*.33; final n=wheel.rays.length;
    final paint=Paint()..style=PaintingStyle.stroke..strokeWidth=1; final fill=Paint()..style=PaintingStyle.fill;
    for(var level=2;level<=10;level+=2){paint.color=textColor.withValues(alpha:.16);canvas.drawCircle(center,radius*level/10,paint);}
    final axisPaint=Paint()..color=textColor.withValues(alpha:.20)..strokeWidth=1; final path=Path();
    for(var i=0;i<n;i++){
      final angle=-math.pi/2+2*math.pi*i/n; final unit=Offset(math.cos(angle),math.sin(angle));
      canvas.drawLine(center,center+unit*radius,axisPaint);
      final score=((scores[wheel.rays[i].id]??0).clamp(0,10))/10; final point=center+unit*radius*score;
      if(i==0)path.moveTo(point.dx,point.dy);else path.lineTo(point.dx,point.dy);
    }
    path.close(); fill.color=accentColor.withValues(alpha:.18);canvas.drawPath(path,fill);
    paint..color=accentColor..strokeWidth=2.5;canvas.drawPath(path,paint);
    final textPainter=TextPainter(textDirection:TextDirection.ltr);
    for(var i=0;i<n;i++){
      final angle=-math.pi/2+2*math.pi*i/n; final labelCenter=center+Offset((radius+24)*math.cos(angle),(radius+24)*math.sin(angle));
      textPainter.text=TextSpan(text:wheel.rays[i].title,style:TextStyle(fontSize:10,color:textColor));
      textPainter.layout(maxWidth:92); textPainter.paint(canvas,labelCenter-Offset(textPainter.width/2,textPainter.height/2));
    }
  }
  @override bool shouldRepaint(covariant _WheelPainter oldDelegate)=>oldDelegate.wheel!=wheel||oldDelegate.scores!=scores||oldDelegate.textColor!=textColor||oldDelegate.accentColor!=accentColor;
}
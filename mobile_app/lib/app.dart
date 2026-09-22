import 'package:flutter/material.dart';
import 'data/app_store.dart';
import 'features/home/home_page.dart';
class PsyToolsApp extends StatefulWidget { const PsyToolsApp({super.key}); @override State<PsyToolsApp> createState()=>_S(); }
class _S extends State<PsyToolsApp> { final store=AppStore(); @override Widget build(BuildContext context)=>MaterialApp(debugShowCheckedModeBanner:false,title:'PSY-TOOLS',theme:ThemeData(useMaterial3:true,colorSchemeSeed:Colors.teal,brightness:Brightness.dark),home:HomePage(store:store)); }

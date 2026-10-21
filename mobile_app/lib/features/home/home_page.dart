import 'package:flutter/material.dart';
import '../../data/app_store.dart';
import '../builder/wheel_builder_page.dart';
import '../journal/journal_page.dart';
import '../mood/mood_page.dart';
import '../backup/backup_page.dart';
import '../wheel/wheel_page.dart';
import '../coaching/reflection_flow_page.dart';

class HomePage extends StatefulWidget {
  final AppStore store;
  const HomePage({super.key, required this.store});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    widget.store.load().then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('PSY-TOOLS')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Колёса баланса',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Исследуйте сферы жизни, отмечайте изменения и выбирайте следующие шаги.',
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ReflectionFlowPage(store: widget.store),
                ),
              ).then((_) {
                if (mounted) setState(() {});
              }),
              icon: const Icon(Icons.psychology_alt),
              label: const Text('Коучинг: исследовать потребность'),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => WheelBuilderPage(store: widget.store),
                ),
              ),
              icon: const Icon(Icons.add_chart),
              label: const Text('Конструктор колеса'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => MoodPage(store: widget.store),
                ),
              ),
              icon: const Icon(Icons.mood),
              label: const Text('Настроение'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => JournalPage(store: widget.store),
                ),
              ).then((_) {
                if (mounted) setState(() {});
              }),
              icon: const Icon(Icons.book),
              label: const Text('Дневник'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BackupPage(store: widget.store),
                ),
              ),
              icon: const Icon(Icons.backup),
              label: const Text('Резервные копии'),
            ),
            const SizedBox(height: 24),
            ...widget.store.wheels().map(
              (wheel) => Card(
                child: ListTile(
                  title: Text(wheel.title),
                  subtitle: Text('${wheel.rays.length} лучей'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => WheelPage(
                        store: widget.store,
                        wheelId: wheel.id,
                      ),
                    ),
                  ).then((_) {
                    if (mounted) setState(() {});
                  }),
                ),
              ),
            ),
          ],
        ),
      );
}

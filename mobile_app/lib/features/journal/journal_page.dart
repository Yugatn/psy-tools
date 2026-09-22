import 'package:flutter/material.dart';
import '../../data/app_store.dart';

class JournalPage extends StatefulWidget {
  final AppStore store;
  const JournalPage({super.key, required this.store});
  @override State<JournalPage> createState() => _JournalPageState();
}

class _JournalPageState extends State<JournalPage> {
  final controller = TextEditingController();
  static const happinessMemory = 'Вы можете вспомнить моменты, которые вызывают у Вас чувство радости, внутреннего спокойствия, счастья?';
  static const happinessQuestion = 'Что делает Вас счастливым?';

  @override void dispose() { controller.dispose(); super.dispose(); }

  Future<void> save() async {
    final text = controller.text.trim();
    if (text.isEmpty) return;
    widget.store.data['journal'].add({
      'id': 'j_' + DateTime.now().microsecondsSinceEpoch.toString(),
      'text': text,
      'createdAt': DateTime.now().toIso8601String(),
      'wheelIds': <String>[],
      'rayIds': <String>[],
      'prompt': happinessQuestion,
    });
    await widget.store.save();
    controller.clear();
    if (mounted) setState(() {});
  }

  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Дневник')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(happinessMemory, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: 7,
          decoration: const InputDecoration(
            hintText: happinessQuestion,
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 10),
        FilledButton.icon(
          onPressed: save,
          icon: const Icon(Icons.save),
          label: const Text('Сохранить запись'),
        ),
        const SizedBox(height: 20),
        const Text('Предыдущие записи', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        ...((widget.store.data['journal'] as List?) ?? []).reversed.map(
          (entry) => Card(child: ListTile(
            title: Text(entry['text'] as String),
            subtitle: Text(entry['createdAt'] as String),
          )),
        ),
      ],
    ),
  );
}

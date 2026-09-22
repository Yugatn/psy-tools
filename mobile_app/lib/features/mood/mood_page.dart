import 'package:flutter/material.dart';
import '../../data/app_store.dart';

class MoodPage extends StatefulWidget {
  final AppStore store;
  const MoodPage({super.key, required this.store});
  @override State<MoodPage> createState() => _MoodPageState();
}

class _MoodPageState extends State<MoodPage> {
  int value = 3;
  final note = TextEditingController();
  static const labels = {
    1: 'Очень плохо',
    2: 'Плохо',
    3: 'Нейтрально',
    4: 'Хорошо',
    5: 'Очень хорошо',
  };

  @override void dispose() { note.dispose(); super.dispose(); }

  Future<void> save() async {
    widget.store.data['mood'].add({
      'value': value,
      'at': DateTime.now().toIso8601String(),
      'note': note.text.trim().isEmpty ? null : note.text.trim(),
    });
    await widget.store.save();
    note.clear();
    if (mounted) setState(() {});
  }

  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Настроение')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Как Вы себя чувствуете сейчас?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(5, (i) {
            final n = i + 1;
            return ChoiceChip(
              label: Text('$n'),
              selected: value == n,
              onSelected: (_) => setState(() => value = n),
            );
          }),
        ),
        const SizedBox(height: 8),
        Center(child: Text(labels[value]!, style: const TextStyle(fontSize: 16))),
        const SizedBox(height: 16),
        TextField(
          controller: note,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Что повлияло на настроение? (необязательно)',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(onPressed: save, icon: const Icon(Icons.save), label: const Text('Сохранить')),
        const SizedBox(height: 24),
        const Text('История', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        ...widget.store.moods().reversed.map(
          (m) => ListTile(
            leading: CircleAvatar(child: Text(m.value.toString())),
            title: Text(labels[m.value] ?? 'Оценка из 5'),
            subtitle: Text(m.note ?? ''),
          ),
        ),
      ],
    ),
  );
}

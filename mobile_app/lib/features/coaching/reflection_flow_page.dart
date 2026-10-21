import 'package:flutter/material.dart';

import '../../data/app_store.dart';
import 'reflection_flow.dart';

/// A simple offline coaching screen powered by a deterministic question graph.
class ReflectionFlowPage extends StatefulWidget {
  final AppStore store;
  const ReflectionFlowPage({super.key, required this.store});

  @override
  State<ReflectionFlowPage> createState() => _ReflectionFlowPageState();
}

class _ReflectionFlowPageState extends State<ReflectionFlowPage> {
  final _textController = TextEditingController();
  final List<String> _route = [starterReflectionFlow.startNodeId];
  final Map<String, String> _answers = {};
  String? _selectedOptionId;
  bool _saved = false;

  ReflectionNode get _node => starterReflectionFlow.nodes[_route.last]!;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _back() {
    if (_route.length <= 1) {
      Navigator.pop(context);
      return;
    }
    setState(() {
      _answers.remove(_route.removeLast());
      _selectedOptionId = null;
      _textController.clear();
    });
  }

  void _continue() {
    final node = _node;
    String? optionId;
    if (node.answerType == ReflectionAnswerType.freeText) {
      final text = _textController.text.trim();
      if (text.isEmpty) return;
      _answers[node.id] = text;
      optionId = node.options.isEmpty ? null : node.options.first.id;
    } else {
      optionId = _selectedOptionId;
      if (optionId == null) return;
      final option = node.options.firstWhere((item) => item.id == optionId);
      _answers[node.id] = option.label;
    }

    final next = optionId == null
        ? null
        : starterReflectionFlow.nextNode(node.id, optionId);
    if (next == null) {
      _saveReflection();
      return;
    }
    setState(() {
      _route.add(next.id);
      _selectedOptionId = null;
      _textController.clear();
    });
  }

  Future<void> _saveReflection() async {
    if (_saved) return;
    final now = DateTime.now();
    final lines = <String>[
      'Коучинговая рефлексия: ${starterReflectionFlow.title}',
      '',
      for (final nodeId in _route)
        if (_answers.containsKey(nodeId))
          '${starterReflectionFlow.nodes[nodeId]!.prompt}\n${_answers[nodeId]}',
    ];
    widget.store.data['journal'].add({
      'id': 'reflection_${now.microsecondsSinceEpoch}',
      'text': lines.join('\n\n'),
      'createdAt': now.toIso8601String(),
      'wheelIds': <String>[],
      'rayIds': <String>[],
      'prompt': starterReflectionFlow.title,
      'kind': 'coaching_reflection',
    });
    await widget.store.save();
    if (!mounted) return;
    setState(() => _saved = true);
  }

  @override
  Widget build(BuildContext context) {
    final node = _node;
    final progress = _route.length / starterReflectionFlow.nodes.length;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Коучинг по колесу'),
        leading: IconButton(
          tooltip: 'Назад',
          onPressed: _back,
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: SafeArea(
        child: _saved
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_outline, size: 56),
                      const SizedBox(height: 16),
                      const Text(
                        'Размышление сохранено',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Запись добавлена в дневник на устройстве. Это инструмент самоисследования, а не психологический диагноз.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Вернуться на главную'),
                      ),
                    ],
                  ),
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: LinearProgressIndicator(
                      value: progress.clamp(0.0, 1.0),
                      minHeight: 7,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Вопрос ${_route.length}',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    node.prompt,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 20),
                  if (node.answerType == ReflectionAnswerType.freeText)
                    TextField(
                      controller: _textController,
                      minLines: 3,
                      maxLines: 6,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        hintText: 'Запиши свой ответ…',
                        border: OutlineInputBorder(),
                      ),
                    )
                  else
                    ...node.options.map(
                      (option) => Card(
                        child: RadioListTile<String>(
                          value: option.id,
                          groupValue: _selectedOptionId,
                          onChanged: (value) =>
                              setState(() => _selectedOptionId = value),
                          title: Text(option.label),
                        ),
                      ),
                    ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: _continue,
                    icon: const Icon(Icons.arrow_forward),
                    label: Text(
                      node.id == 'small_step'
                          ? 'Сохранить размышление'
                          : 'Продолжить',
                    ),
                  ),
                  if (node.skippable)
                    TextButton(
                      onPressed: () {
                        if (node.options.isEmpty) {
                          _saveReflection();
                          return;
                        }
                        final nextId = node.defaultNextNodeId;
                        if (nextId == null) {
                          _saveReflection();
                          return;
                        }
                        setState(() {
                          _route.add(nextId);
                          _selectedOptionId = null;
                          _textController.clear();
                        });
                      },
                      child: const Text('Пропустить вопрос'),
                    ),
                ],
              ),
      ),
    );
  }
}

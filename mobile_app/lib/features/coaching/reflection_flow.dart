/// Deterministic, AI-free branching reflection flow for PSY-TOOLS.
///
/// A flow is a graph of prompts. Answers select explicit routes, which makes
/// behavior predictable, testable, and usable offline.
enum ReflectionAnswerType { singleChoice, multipleChoice, scale, freeText }

class ReflectionOption {
  final String id;
  final String label;
  final String? nextNodeId;

  const ReflectionOption({
    required this.id,
    required this.label,
    this.nextNodeId,
  });
}

class ReflectionNode {
  final String id;
  final String prompt;
  final ReflectionAnswerType answerType;
  final List<ReflectionOption> options;
  final String? defaultNextNodeId;
  final bool skippable;

  const ReflectionNode({
    required this.id,
    required this.prompt,
    this.answerType = ReflectionAnswerType.singleChoice,
    this.options = const [],
    this.defaultNextNodeId,
    this.skippable = true,
  });
}

class ReflectionFlow {
  final String id;
  final String title;
  final String startNodeId;
  final Map<String, ReflectionNode> nodes;

  const ReflectionFlow({
    required this.id,
    required this.title,
    required this.startNodeId,
    required this.nodes,
  });

  ReflectionNode? get startNode => nodes[startNodeId];

  /// Returns the next node for a selected option, or null when the route ends.
  /// Throws [ArgumentError] when the node or option is not part of this flow.
  ReflectionNode? nextNode(String nodeId, String optionId) {
    final node = nodes[nodeId];
    if (node == null) {
      throw ArgumentError.value(nodeId, 'nodeId', 'Unknown reflection node');
    }
    final option = node.options.where((item) => item.id == optionId);
    if (option.isEmpty) {
      throw ArgumentError.value(optionId, 'optionId', 'Unknown option for node');
    }
    final nextId = option.first.nextNodeId ?? node.defaultNextNodeId;
    return nextId == null ? null : nodes[nextId];
  }

  /// Reports malformed references so flows can be checked in tests or tooling.
  List<String> validate() {
    final errors = <String>[];
    if (!nodes.containsKey(startNodeId)) {
      errors.add('Start node "$startNodeId" does not exist.');
    }
    for (final entry in nodes.entries) {
      final node = entry.value;
      if (entry.key != node.id) {
        errors.add('Map key "${entry.key}" differs from node id "${node.id}".');
      }
      final optionIds = <String>{};
      for (final option in node.options) {
        if (!optionIds.add(option.id)) {
          errors.add('Node "${node.id}" has duplicate option "${option.id}".');
        }
        if (option.nextNodeId != null &&
            !nodes.containsKey(option.nextNodeId)) {
          errors.add(
            'Option "${option.id}" in "${node.id}" references missing node "${option.nextNodeId}".',
          );
        }
      }
      if (node.defaultNextNodeId != null &&
          !nodes.containsKey(node.defaultNextNodeId)) {
        errors.add(
          'Node "${node.id}" references missing default node "${node.defaultNextNodeId}".',
        );
      }
    }
    return errors;
  }
}

/// Example starter route for reflecting on one selected area of the wheel.
/// This is a proposal/template, not a validated psychological instrument.
const starterReflectionFlow = ReflectionFlow(
  id: 'wheel_ray_reflection_v1',
  title: 'Исследование выбранной сферы',
  startNodeId: 'what_matters',
  nodes: {
    'what_matters': ReflectionNode(
      id: 'what_matters',
      prompt: 'Что в этой сфере сейчас для тебя важнее всего?',
      options: [
        ReflectionOption(
          id: 'satisfaction',
          label: 'Удовлетворённость тем, что уже есть',
          nextNodeId: 'supporting',
        ),
        ReflectionOption(
          id: 'change',
          label: 'Изменить то, что меня не устраивает',
          nextNodeId: 'desired_change',
        ),
        ReflectionOption(
          id: 'unclear',
          label: 'Пока не понимаю, чего хочу',
          nextNodeId: 'explore',
        ),
      ],
    ),
    'supporting': ReflectionNode(
      id: 'supporting',
      prompt: 'Что помогает сохранять то, что тебя устраивает?',
      answerType: ReflectionAnswerType.freeText,
      options: [
        ReflectionOption(id: 'continue', label: 'Продолжить', nextNodeId: 'small_step'),
      ],
    ),
    'desired_change': ReflectionNode(
      id: 'desired_change',
      prompt: 'Какое конкретное изменение сделало бы эту сферу лучше для тебя?',
      answerType: ReflectionAnswerType.freeText,
      options: [
        ReflectionOption(id: 'continue', label: 'Продолжить', nextNodeId: 'small_step'),
      ],
    ),
    'explore': ReflectionNode(
      id: 'explore',
      prompt: 'Что стоило бы исследовать, чтобы яснее понять свои потребности?',
      answerType: ReflectionAnswerType.freeText,
      options: [
        ReflectionOption(id: 'continue', label: 'Продолжить', nextNodeId: 'small_step'),
      ],
    ),
    'small_step': ReflectionNode(
      id: 'small_step',
      prompt: 'Какой небольшой шаг ты готов попробовать в ближайшие семь дней?',
      answerType: ReflectionAnswerType.freeText,
      options: [
        ReflectionOption(id: 'finish', label: 'Сохранить размышление'),
      ],
    ),
  },
);

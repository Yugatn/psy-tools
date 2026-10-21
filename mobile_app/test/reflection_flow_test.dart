import 'package:flutter_test/flutter_test.dart';
import 'package:psy_tools_mobile/features/coaching/reflection_flow.dart';

void main() {
  group('ReflectionFlow', () {
    test('starter flow has valid node references', () {
      expect(starterReflectionFlow.validate(), isEmpty);
    });

    test('choice routes to the expected branch', () {
      expect(
        starterReflectionFlow.nextNode('what_matters', 'change')?.id,
        'desired_change',
      );
      expect(
        starterReflectionFlow.nextNode('what_matters', 'unclear')?.id,
        'explore',
      );
    });

    test('terminal option ends the route', () {
      expect(
        starterReflectionFlow.nextNode('small_step', 'finish'),
        isNull,
      );
    });

    test('unknown options are rejected', () {
      expect(
        () => starterReflectionFlow.nextNode('what_matters', 'missing'),
        throwsArgumentError,
      );
    });

    test('missing route references are reported', () {
      const invalid = ReflectionFlow(
        id: 'invalid',
        title: 'Invalid flow',
        startNodeId: 'start',
        nodes: {
          'start': ReflectionNode(
            id: 'start',
            prompt: 'Question',
            options: [
              ReflectionOption(
                id: 'next',
                label: 'Continue',
                nextNodeId: 'absent',
              ),
            ],
          ),
        },
      );
      expect(invalid.validate(), isNotEmpty);
    });
  });
}

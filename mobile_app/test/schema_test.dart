import 'package:flutter_test/flutter_test.dart';
import 'package:psy_tools_mobile/data/schema.dart';

Map<String, dynamic> validData({
  List<dynamic>? scores,
  List<dynamic>? mood,
}) => {
  'schemaVersion': Schema.current,
  'wheels': [
    {
      'id': 'w1',
      'title': 'Тест',
      'rays': [
        {'id': 'r1', 'title': 'Луч', 'childWheelId': null},
      ],
    },
  ],
  'scores': scores ?? [],
  'journal': [],
  'calendar': [],
  'mood': mood ?? [],
};

void main() {
  test('migrates v1 backup', () {
    final data = Schema.migrate({'schemaVersion': 1, 'wheels': []});
    expect(data['schemaVersion'], Schema.current);
    expect(data['journal'], isA<List>());
  });

  test('rejects future schema', () {
    expect(
      () => Schema.migrate({'schemaVersion': 999, 'wheels': []}),
      throwsFormatException,
    );
  });

  test('accepts wheel score in range', () {
    expect(() => Schema.validate(validData(scores: [
      {'wheelId': 'w1', 'rayId': 'r1', 'value': 7.5},
    ])), returnsNormally);
  });

  test('rejects wheel score outside range', () {
    expect(
      () => Schema.validate(validData(scores: [
        {'wheelId': 'w1', 'rayId': 'r1', 'value': 11},
      ])),
      throwsFormatException,
    );
  });

  test('accepts mood from 1 to 5', () {
    expect(() => Schema.validate(validData(mood: [
      {'value': 5, 'at': '2026-09-23T00:00:00Z'},
    ])), returnsNormally);
  });

  test('rejects mood outside 1 to 5', () {
    expect(
      () => Schema.validate(validData(mood: [
        {'value': 6, 'at': '2026-09-23T00:00:00Z'},
      ])),
      throwsFormatException,
    );
  });
}

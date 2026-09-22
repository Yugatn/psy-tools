import 'package:flutter_test/flutter_test.dart';

void main() {
  test('happiness reflection questions are part of the journal specification', () {
    const q1 = 'Вы можете вспомнить моменты, которые вызывают у Вас чувство радости, внутреннего спокойствия, счастья?';
    const q2 = 'Что делает Вас счастливым?';
    expect(q1, contains('радости'));
    expect(q2, contains('счастливым'));
  });
}

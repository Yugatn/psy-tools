import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../data/app_store.dart';
import '../../domain/models.dart';

class WheelPage extends StatefulWidget {
  final AppStore store;
  final String wheelId;

  const WheelPage({super.key, required this.store, required this.wheelId});

  @override
  State<WheelPage> createState() => _WheelPageState();
}

class _WheelPageState extends State<WheelPage> {
  Future<void> _saveScore(Wheel wheel, WheelRay ray, double value) async {
    final scores = (widget.store.data['scores'] as List).cast<Map<String, dynamic>>();
    scores.add(WheelScore(
      wheelId: wheel.id,
      rayId: ray.id,
      value: value,
      at: DateTime.now(),
    ).toJson());
    await widget.store.save();
  }

  double _currentScore(Wheel wheel, WheelRay ray) {
    final scores = (widget.store.data['scores'] as List?) ?? const [];
    for (final raw in scores.reversed) {
      final item = Map<String, dynamic>.from(raw as Map);
      if (item['wheelId'] == wheel.id && item['rayId'] == ray.id) {
        return (item['value'] as num).toDouble();
      }
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final wheel = widget.store.wheels().where((w) => w.id == widget.wheelId).firstOrNull;
    if (wheel == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Колесо')),
        body: const Center(child: Text('Колесо не найдено')),
      );
    }

    final scores = {
      for (final ray in wheel.rays) ray.id: _currentScore(wheel, ray),
    };

    return Scaffold(
      appBar: AppBar(title: Text(wheel.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: CustomPaint(
              painter: _WheelPainter(wheel: wheel, scores: scores),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Оцените каждый луч от 0 до 10',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          for (final ray in wheel.rays)
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(ray.title)),
                        Text(scores[ray.id]!.toStringAsFixed(0)),
                      ],
                    ),
                    Slider(
                      min: 0,
                      max: 10,
                      divisions: 10,
                      value: scores[ray.id]!,
                      label: scores[ray.id]!.toStringAsFixed(0),
                      onChanged: (value) {
                        setState(() => scores[ray.id] = value);
                      },
                      onChangeEnd: (value) => _saveScore(wheel, ray, value),
                    ),
                    if (ray.childWheelId != null)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => WheelPage(
                                store: widget.store,
                                wheelId: ray.childWheelId!,
                              ),
                            ),
                          ).then((_) => setState(() {})),
                          icon: const Icon(Icons.account_tree),
                          label: const Text('Открыть подробное колесо'),
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _WheelPainter extends CustomPainter {
  final Wheel wheel;
  final Map<String, double> scores;

  _WheelPainter({required this.wheel, required this.scores});

  @override
  void paint(Canvas canvas, Size size) {
    if (wheel.rays.isEmpty) return;
    final center = size.center(Offset.zero);
    final radius = size.shortestSide * .38;
    final n = wheel.rays.length;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    final fill = Paint()..style = PaintingStyle.fill;

    for (var level = 1; level <= 10; level++) {
      final r = radius * level / 10;
      canvas.drawCircle(center, r, paint);
    }

    final path = Path();
    for (var i = 0; i < n; i++) {
      final angle = -3.1415926535 / 2 + 2 * 3.1415926535 * i / n;
      final end = center + Offset(r * math.cos(angle), r * math.sin(angle));
      canvas.drawLine(center, end, paint);
      final score = (scores[wheel.rays[i].id] ?? 0).clamp(0, 10) / 10;
      final point = center + Offset(radius * score * math.cos(angle), radius * score * math.sin(angle));
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    path.close();
    fill.color = Colors.teal.withValues(alpha: .18);
    canvas.drawPath(path, fill);
    paint.color = Colors.teal;
    paint.strokeWidth = 2.5;
    canvas.drawPath(path, paint);

    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    for (var i = 0; i < n; i++) {
      final angle = -3.1415926535 / 2 + 2 * 3.1415926535 * i / n;
      final labelCenter = center + Offset((radius + 20) * math.cos(angle), (radius + 20) * math.sin(angle));
      textPainter.text = TextSpan(
        text: wheel.rays[i].title,
        style: const TextStyle(fontSize: 10, color: Colors.white),
      );
      textPainter.layout(maxWidth: 90);
      textPainter.paint(canvas, labelCenter - Offset(textPainter.width / 2, textPainter.height / 2));
    }
  }

  @override
  bool shouldRepaint(covariant _WheelPainter oldDelegate) =>
      oldDelegate.wheel != wheel || oldDelegate.scores != scores;
}


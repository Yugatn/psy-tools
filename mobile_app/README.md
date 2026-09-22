# PSY-TOOLS Mobile

Flutter-приложение для всех колёс баланса, их конструирования, дневника, аналитики, обновлений и резервных копий.

## Архитектура
Domain: Wheel, WheelRay, WheelScore, JournalEntry. Data: локальное JSON-хранилище с версией схемы. Features: Explorer, Builder, Journal, Insights, Backup/Restore, Settings.
Главный принцип: offline-first и экспортируемые пользователем данные. Любой луч может ссылаться на дочернее колесо, поэтому модель поддерживает рекурсивную детализацию.

## Синтез аудита
Daylio полезен быстрым журналом, целями, статистикой, кастомизацией и локальным хранением с cloud/manual backup. Finch добавляет goals, тематические self-care areas, reflections/journaling и автоматические cloud backups. В PSY-TOOLS эти паттерны объединены вокруг иерархических колёс.

## Запуск
flutter pub get
flutter run
flutter test

## Backup contract
Архив содержит schemaVersion, appVersion, exportedAt, wheels, scores, journal, settings. Импорт сначала валидируется; перед заменой данных должен создаваться safety snapshot.

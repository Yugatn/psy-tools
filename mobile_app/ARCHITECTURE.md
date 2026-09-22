# Архитектура PSY-TOOLS Mobile

## 1. Domain
Wheel — контейнер сферы.
WheelRay — луч, который может иметь childWheelId.
WheelScore — временная оценка луча.
JournalEntry — рефлексия, которую можно связать с колесом и лучом.

## 2. Recursive graph
Колёса образуют ориентированный граф. Приложение должно запрещать циклические ссылки. Глубина детализации не фиксирована.

## 3. Local-first
Основные операции работают без сети. Синхронизация и cloud backup являются дополнительными адаптерами.

## 4. Data safety
Каждая версия данных имеет schemaVersion. Перед заменой данных импортированный backup проходит migration + validation. Будущие несовместимые схемы отклоняются.

## 5. Journal
Дневник не является отдельным изолированным блокнотом. Запись может быть связана с колесом, лучом, оценкой и впоследствии с целью.

## 6. Future modules
WheelRenderer, WheelEditor, ScoreHistory, ReflectionPrompts, Goals, Insights, ImportExport, CloudSync, UpdateService.

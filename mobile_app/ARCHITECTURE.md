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


## Security and data protection
Local application data is encrypted at rest with AES-256-GCM. The encryption key is generated per installation and stored in platform secure storage (Keychain/Keystore-backed storage through flutter_secure_storage). Legacy plaintext storage is migrated once and removed after successful encrypted save. Encryption is authenticated, so tampering with ciphertext causes decryption failure.

This protects stored data on the device; it does not make the application invulnerable to a compromised device, malicious code, screenshots, backups, or a user who has unlocked the device. Exported backups require a separate password-based encryption layer before they are treated as encrypted backups.

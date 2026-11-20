# Tanys 1.0 — мониторинг, оповещения и восстановление базы (`#59`)

Описывает наблюдаемость, очистку ПДн из логов, пороги оповещений и процедуру резервного копирования/восстановления PostgreSQL для окружений [`docs/deployment-release.md`](deployment-release.md) и правил данных [`docs/data-processing-rules.md`](data-processing-rules.md).

## 1. Контролируемые сигналы и пороги оповещений

| Сигнал | Источник | Порог срабатывания | Уровень | Действие |
| --- | --- | --- | --- | --- |
| Доступность API и БД | `deploy/health-alert.mjs` (`GET /health`, `GET /ready` каждые 60 с) | 2 провала подряд или `/ready != 200` | Critical | Немедленное оповещение, проверка контейнеров и откат (`deploy/release.sh rollback`) |
| Ошибки API (5xx) | `server/src/observability.ts` | `>= 5` ответов 5xx за 5 мин | Critical | Проверка последних изменений/логов и откат при деградации |
| Ошибки входа (`POST /auth/*`) | `server/src/observability.ts` | `>= 20` ошибок 4xx/5xx за 5 мин | Warning | Проверка rate-limit и доступности SMTP |
| Время подбора (p95) | `server/src/observability.ts` | `p95 > 1500 мс` (при лимите кейса 3000 мс) | Warning | Профилирование запросов БД и индексов |
| Доставка писем (SMTP) | `server/src/observability.ts` | Ошибок `> 5%` при `>= 5` письмах | Critical | Проверка квот SMTP, SPF/DKIM и очереди |

- **Получатель оповещений:** дежурный инженер (ответственный за релиз) и капитан проекта через `ALERT_WEBHOOK_URL` (Telegram/Slack webhook, задаётся в `deploy/.env.<env>`).
- **Удаление ПДн из логов:** все структурные логи проходят через `redactPii()` / `formatSafeLog()` в [`server/src/observability.ts`](../server/src/observability.ts) — ключи `email`, `contact`, `value`, `about`, `details`, `name`, `code`, `token`, `password`, `cookie`, `authorization`, `smtp_url`, `database_url` заменяются на `[redacted]`, email-адреса и учётные данные в URL (`postgres://`, `smtps://`) маскируются.
- **Срок хранения логов:** до **30 дней** (автоматическая ротация, без ПДн).

## 2. Целевые показатели резервного копирования (RPO / RTO)

| Параметр | Значение | Реализация |
| --- | --- | --- |
| **RPO** (приемлемая потеря данных) | **≤ 24 часа** в обычном режиме; **≤ 6 часов** в день активного митапа | `cron`: ежедневно в 03:00 UTC + каждые 6 ч в день мероприятия (`deploy/backup-db.sh`) |
| **RTO** (время восстановления) | **≤ 30 минут** | Изолированное восстановление и переключение (`deploy/restore-db.sh`) |
| **Срок хранения копий** | **≤ 30 дней** (`BACKUP_RETENTION_DAYS=30`) | Автоудаление старых `.dump` и `.sha256` в `deploy/backup-db.sh` (согласовано с `#48`) |

## 3. Проверка тестового сбоя и доставки оповещения

```sh
# Проверка без реального отключения сервиса (отправляет критическое оповещение в ALERT_WEBHOOK_URL):
APP_ENV=staging ALERT_WEBHOOK_URL="https://..." node deploy/health-alert.mjs --simulate-failure

# Регулярный cron (каждую минуту):
* * * * * APP_ENV=production MONITOR_BASE_URL="https://<domain>" ALERT_WEBHOOK_URL="https://..." node /srv/tanys/deploy/health-alert.mjs
```

Автоматическая проверка доставки при 503 и `--simulate-failure` закреплена в `server/tests/observability.test.mjs`.

## 4. Резервное копирование и учебное восстановление в отдельную БД

```sh
# 1. Снять резервную копию (с контрольной суммой SHA-256 и ротацией 30 дней):
# Вариант А — VPS (Docker Compose):
./deploy/backup-db.sh production /var/backups/tanys
# Вариант Б — управляемый PostgreSQL (например, Vercel + Neon/Supabase из #97):
DATABASE_URL="postgres://..." ./deploy/backup-db.sh production /var/backups/tanys

# 2. Восстановить копию в изолированную БД (не затрагивая рабочую!) и замерить RPO/RTO:
# Вариант А — VPS (Docker Compose):
./deploy/restore-db.sh production /var/backups/tanys/production/tanys_production_<STAMP>.dump tanys_restore_verify
# Вариант Б — управляемый PostgreSQL (отдельная проверочная БД VERIFY_DATABASE_URL):
VERIFY_DATABASE_URL="postgres://..." ./deploy/restore-db.sh production /var/backups/tanys/production/tanys_production_<STAMP>.dump
```

Скрипт `restore-db.sh` проверяет контрольную сумму `.sha256`, разворачивает дамп в временную базу `tanys_restore_verify`, проверяет таблицы `schema_migrations`, `users`, `events`, удаляет временную БД и выводит JSON с `backupAgeMinutes` (свежесть/RPO) и `rtoSeconds` (время восстановления/RTO).

## 5. Чек-лист приёмки на живом окружении (`#59`)

- [ ] На staging/production задан реальный `ALERT_WEBHOOK_URL` и проверен `--simulate-failure` с получением уведомления ответственным.
- [ ] Настроен cron для `deploy/backup-db.sh` и проверено восстановление `deploy/restore-db.sh` в отдельную БД с фиксацией `backupAgeMinutes` и `rtoSeconds`.

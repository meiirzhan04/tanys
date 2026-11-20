# Tanys 1.0 — окружения staging, production и процесс выпуска (`#58`)

Реализует схему размещения из [`docs/service-v1.md`](service-v1.md): один HTTPS-узел на окружение (`Caddy` с автоматическим TLS + статический фронт `web` + `api` на Node.js 22 + внутренний `PostgreSQL 17`).

## 1. Рекомендуемая смета пилота (на согласование капитану)

| Статья | Окружение | Рекомендация | Ориентир / мес |
| --- | --- | --- | --- |
| VPS (2 vCPU, 4 GB RAM, 40 GB NVMe, регион РК) | Production | Отдельный сервер в РК по [`docs/data-processing-rules.md`](data-processing-rules.md) | ~$10–20 |
| VPS (1–2 vCPU, 2 GB RAM, синтетические данные) | Staging | Изолированный сервер / отдельный проект Docker | ~$5–10 |
| Домен + DNS | Общий | `<domain>` (prod) и `staging.<domain>` (staging) | ~$1–2 |
| TLS-сертификаты | Staging + Prod | Автоматический выпуск и продление Let's Encrypt через `Caddy` (`deploy/Caddyfile`) | $0 |
| Транзакционный SMTP (коды входа) | Staging + Prod | Выделенный почтовый домен с SPF, DKIM и DMARC (разные учётные данные на окружение) | $0–15 |

## 2. Изоляция окружений и секретов

Окружения `staging` и `production` используют **разные**:
- GitHub Environments (`staging` и `production`) и отдельные секреты `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_DIR`;
- домены (`staging.<domain>` и `<domain>`);
- файлы окружения на хостах (`deploy/.env.staging` и `deploy/.env.production`, создаются из `*.example` и не коммитятся в Git);
- базы данных и тома PostgreSQL (`tanys_staging` vs `tanys_prod`);
- криптографические ключи (`POSTGRES_PASSWORD`, `SESSION_SECRET`) и учётные записи SMTP.

## 3. Права на выпуск релизов

| Роль | Staging | Production |
| --- | --- | --- |
| Автовыпуск из `main` (`release.yml`) | Автоматически после `npm test`, `verify-matching.mjs` и сборок web/server | Запрещено автоматически |
| Meiirzhan (капитан / release owner) | Полный доступ (deploy + rollback) | Единственный обязательный reviewer в GitHub Environment `production` |
| Ответственный за релиз (Antigravity / инженер команды) | Deploy + rollback | Запускает `workflow_dispatch` с проверенным `release_tag` после подтверждения капитана |

## 4. Настройка почтового домена для входа (`POST /auth/challenges`)

Перед открытием реальной регистрации:
1. Выделить домен/поддомен отправителя (например, `mail.<domain>`).
2. Прописать DNS-записи `SPF`, `DKIM` (2048-bit) и `DMARC` (`p=quarantine` или `p=reject`).
3. Выпустить отдельные SMTP-учётки для staging и production и проверить доставку тестового письма.

## 5. Порядок выпуска и отката

1. **Staging (сначала всегда сюда):**
   - Push в `main` собирает и публикует образы `ghcr.io/<repo>-web:<sha>` и `ghcr.io/<repo>-api:<sha>`, затем вызывает `deploy/release.sh deploy staging <sha>`.
   - Скрипт запускает миграции (`migrate`), поднимает `api`/`web`/`proxy` и проверяет `GET /ready`. При провале автоматически откатывает к предыдущему тегу.
2. **Проверка на staging:**
   - Проверить `https://staging.<domain>/health` и `https://staging.<domain>/ready` (`{"status":"ready"}`), вход по коду и миграции.
3. **Production:**
   - Запустить `Actions → Release → Run workflow` с `target: production`, `action: deploy`, `release_tag: <проверенный-на-staging-sha>`.
   - Капитан подтверждает выпуск в GitHub Environment `production`.
4. **Откат:**
   - Запустить `Actions → Release` с `action: rollback` и `release_tag: <предыдущий-sha>` (или на хосте выполнить `./deploy/release.sh rollback <staging|production>`).
   - Совместимость со схемой БД обеспечивается правилом расширяющих миграций из [`docs/service-v1.md`](service-v1.md).

## 6. Чек-лист приёмки на живых площадках (`#58`)

- [ ] Капитан утвердил смету, провайдера VPS/БД, домен и SMTP-домен.
- [ ] Созданы GitHub Environments `staging` и `production` (с required reviewer для `production`) и заполнены секреты.
- [ ] На staging выполнен тестовый `deploy` и `rollback` через `deploy/release.sh`, `/ready` отвечает `200`.
- [ ] Production доступен по `https://<domain>`, сертификат выдан и продлевается автоматически через Caddy, ключи и БД изолированы от staging.

## API на Vercel

Функция gateway обслуживает /api/v1/* на том же домене, что и React. В Settings → Environment Variables проекта задайте серверные переменные и выполните новый деплой. Регистрация и вход по паролю требуют DATABASE_URL и APP_ORIGIN. SMTP_URL и MAIL_FROM нужны для прежнего API входа по коду. У Preview должны быть собственные база, почта и origin.

| Переменная | Production |
| --- | --- |
| DATABASE_URL | Строка PostgreSQL от утверждённого провайдера с TLS, предпочтительно pooled URL для функции. Используйте параметры проверки сертификата провайдера, например sslmode=verify-full для публичного доверенного CA. |
| APP_ORIGIN | https://tanys-new.vercel.app |
| SMTP_URL | SMTP URL с учётными данными и TLS для включения прежней отправки кодов |
| MAIL_FROM | Подтверждённый адрес отправителя |

Перед выпуском из доверенного окружения задайте DATABASE_URL для соответствующей базы (прямое подключение для миграций), затем выполните:

```sh
cd server
npm ci
npm run build
npm run migrate
```

Повторный запуск сверяет контрольные суммы применённых миграций. Секреты задаются только на сервере. После выпуска проверьте 401 на GET /api/v1/me из чистого браузера, регистрацию и повторный вход по логину и паролю. Проверьте переход с QR-приглашения в событие. До подключения окружения функция возвращает 503. Допуск реальных участников регулируется правилами пилота #48.

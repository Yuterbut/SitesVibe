# SitesVibe

Проект по созданию сайтов. Дизайн-интеллект подключён через Claude Code skills,
вендоренные прямо в репозиторий (`.claude/skills/`), поэтому они работают
в любой сессии — локально, в вебе и в CI — без установки плагинов.

## Установленные скилы

### ui-ux-pro-max-skill

Источник: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · v2.13.0 · MIT

| Skill | Назначение |
|---|---|
| `ui-ux-pro-max` | Ядро: локальная поисковая база — 79 стилей, 192 палитры, 74 шрифтовые пары, 119 UX-правил, 105 иконок, 17 GSAP-пресетов, 25 типов графиков, 22 стека |
| `design-suite` | Зонтичный скил: бренд-айдентика, токены, логотипы, CIP, баннеры, иконки, соцсети (апстрим называет его `design`, переименован из-за конфликта имён) |
| `design-system` | Трёхслойные токены (primitive → semantic → component), спеки компонентов, слайды |
| `ui-styling` | shadcn/ui + Tailwind, доступные компоненты, тёмная тема, canvas-визуалы |
| `brand` | Tone of voice, визуальная идентичность, гайдлайны, консистентность бренда |
| `slides` | HTML-презентации с Chart.js и токенами |
| `banner-design` | Баннеры для соцсетей, рекламы, hero-секций и печати |

### taste-skill

Источник: [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) · v1.0.0 · MIT

Директории названы по **install name** (полю `name:` во фронтматтере), как требует апстрим.

| Skill | Назначение |
|---|---|
| `design-taste-frontend` | Основной anti-slop скил: лендинги, портфолио, редизайны (v2) |
| `design-taste-frontend-v1` | Легаси v1, если нужна ровно прежняя логика |
| `high-end-visual-design` | Дорогой «агентский» вид: шрифты, воздух, глубина, анимации |
| `minimalist-ui` | Чистый редакторский минимализм в духе Notion/Linear |
| `industrial-brutalist-ui` | Швейцарская типографика + терминальная эстетика (beta) |
| `redesign-existing-projects` | Аудит и апгрейд существующих сайтов без поломки функционала |
| `full-output-enforcement` | Запрет на обрезанный код и плейсхолдеры в выводе |
| `gpt-taste` | Awwwards-уровень: GSAP-моушн, AIDA-структура, bento-сетки |
| `image-to-code` | Сначала генерим дизайн-картинки, потом верстаем по ним |
| `imagegen-frontend-web` | Генерация референс-картинок для веба (одна картинка на секцию) |
| `imagegen-frontend-mobile` | Генерация экранов мобильных приложений |
| `brandkit` | Бренд-борды, логосистемы, айдентика-деки |
| `stitch-design-taste` | Семантические правила дизайна для Google Stitch |

## Требования

- **Python 3.x** — нужен для поискового скрипта `ui-ux-pro-max` (только стандартная библиотека, сеть не используется).
- **GEMINI_API_KEY** — нужен только для генерации логотипов/иконок в скиле `design`. Без ключа остальные части работают.

## Быстрая проверка

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system -p "MyApp"
python .claude/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
python .claude/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
```

## Известные ограничения

- Скил `design` переименован в `design-suite`: имя `design` занято встроенным скилом Claude Code,
  из-за чего проектный скил не загружался вовсе. Пути к его скриптам внутри переписаны под новое имя.
- `banner-design` в шагах генерации картинок и скриншотов ссылается на компаньон-скилы
  `ai-artist`, `ai-multimodal` и `chrome-devtools` — они не входят в апстрим-репозиторий
  и здесь не установлены. Текстовая часть (арт-дирекция, размеры, стили) работает полностью.
- Часть скилов taste-skill написана под другие агенты (`gpt-taste` — под GPT/Codex,
  `image-to-code` — под Codex, `stitch-design-taste` — под Google Stitch). Содержимое
  применимо и в Claude Code, но при желании их можно удалить, чтобы не пересекались триггеры.

## Обновление скилов

Скилы вендорены, а не подключены как плагины, — обновление ручное:

```bash
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill /tmp/uiux
cp -r /tmp/uiux/.claude/skills/* .claude/skills/
# после обновления заново заменить ${CLAUDE_PLUGIN_ROOT}/.claude/skills/ на .claude/skills/
sed -i 's|${CLAUDE_PLUGIN_ROOT}/\.claude/skills/|.claude/skills/|g' .claude/skills/ui-ux-pro-max/SKILL.md

git clone --depth 1 https://github.com/leonxlnx/taste-skill /tmp/taste
# скопировать каждую папку taste/skills/<folder> в .claude/skills/<install-name>
```

Вендоренные версии зафиксированы в [`.claude/skills/INSTALL.md`](.claude/skills/INSTALL.md).

## Лицензии

Оба набора скилов под MIT. Копии лицензий — в [`.claude/skills/_licenses/`](.claude/skills/_licenses).

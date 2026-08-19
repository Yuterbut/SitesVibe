# Origin of vendored skills

These skills are vendored copies, not plugin installs. The remote Claude Code
environment runs with `SKIP_PLUGIN_MARKETPLACE=true`, so `/plugin marketplace add`
is unavailable; copying the skills into the repository makes them load in every
session and keeps them under version control.

## Sources

| Upstream | Version | Commit | License |
|---|---|---|---|
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 2.13.0 | `8a1a6d857332da32252d77365da90c3f6293b47b` | MIT |
| https://github.com/leonxlnx/taste-skill | 1.0.0 | `dfb6f9f9e93a39f673b1827c0889cc28326d1800` | MIT |

Vendored on 2026-08-19.

## Local modifications

Two changes were made to upstream content:

- `ui-ux-pro-max/SKILL.md` — the 11 `${CLAUDE_PLUGIN_ROOT}/.claude/skills/…` script
  paths were rewritten to project-relative `.claude/skills/…`, because
  `CLAUDE_PLUGIN_ROOT` is only set for plugin installs. The sentence introducing
  the search tool was reworded to match.

- The `design` skill was renamed to `design-suite` (directory, frontmatter `name`, and
  the script paths in `SKILL.md` and `references/*.md`). Claude Code ships a built-in
  skill called `design`, which shadowed the project one so it never loaded at all.
  Its script paths also assumed a global install (`~/.claude/skills/design/…`) and were
  rewritten to the project-relative `.claude/skills/design-suite/…`.

Everything else is byte-identical to upstream.

## Directory naming

`taste-skill` ships folder names that differ from the skill's install name
(the `name:` field in the SKILL.md frontmatter). Upstream's own installer keys off
the install name, so the folders here are named accordingly:

| Upstream folder | Installed as |
|---|---|
| `taste-skill` | `design-taste-frontend` |
| `taste-skill-v1` | `design-taste-frontend-v1` |
| `soft-skill` | `high-end-visual-design` |
| `minimalist-skill` | `minimalist-ui` |
| `brutalist-skill` | `industrial-brutalist-ui` |
| `redesign-skill` | `redesign-existing-projects` |
| `output-skill` | `full-output-enforcement` |
| `gpt-tasteskill` | `gpt-taste` |
| `image-to-code-skill` | `image-to-code` |
| `stitch-skill` | `stitch-design-taste` |

`brandkit`, `imagegen-frontend-web` and `imagegen-frontend-mobile` already matched.
All seven `ui-ux-pro-max-skill` folders already matched their install names.

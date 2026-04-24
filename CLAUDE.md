# CLAUDE.md — Cashé

Las convenciones portables del proyecto viven en `@AGENTS.md`. Este archivo solo tiene lo específico del harness de Claude Code.

@AGENTS.md

## Subagents del proyecto

En `.claude/agents/` hay agentes especializados para Cashé. Usalos cuando aplique:

- `supabase-cashe` — experto en el schema y RLS del proyecto.
- `edge-function-dev` — para las 7 Edge Functions (WhatsApp, Telegram, recurring, notifications).
- `database-reviewer` — revisión de queries y migraciones pre-commit.
- `code-reviewer` — revisión de código general pre-commit.
- `security-reviewer` — revisión de seguridad (RLS, inputs, auth).
- `mobile-pwa-architect` — features de PWA, service worker, haptics.
- `planner` — planificación antes de implementar cambios sustanciales.
- `refactor-cleaner` — limpieza de código muerto de forma segura.

## Skills del proyecto

Skills custom viven en `.claude/skills/`. Se cargan automáticamente por su `description`. Incluyen `frontend-patterns`, `postgres-patterns`, `tdd-workflow`, `security-review`, `verification-loop` y el flujo `openspec-*`.

Skills globales instaladas para este stack están listadas en `.claude/skills-registry.md` (cheatsheet).

## Workflows

- **SDD con OpenSpec** — para cambios sustanciales usar `/opsx:propose`, `/opsx:apply`, `/opsx:archive`. OpenSpec vive en `openspec/` (config + specs + changes). Detalle del flujo en `~/.claude/CLAUDE.md` (instrucciones globales).
- **Hooks y permisos** — ver `.claude/settings.local.json`. Tocar solo vía el skill `update-config`.

## Reglas path-scoped

`.claude/rules/` tiene convenciones que aplican a subdirectorios específicos (Supabase, componentes, hooks, bots). Se cargan automáticamente cuando se toca el path correspondiente.

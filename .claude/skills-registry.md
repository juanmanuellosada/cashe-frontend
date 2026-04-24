# Skills Registry — Cashé

> **Visibility aid.** Claude Code auto-loads skills via su campo `description` — este archivo es para el humano, no para el agente. Sirve para que veas de un vistazo qué skills globales aplican al stack de este proyecto y cuándo se van a disparar.

Stack de referencia: React 18 + Vite 6 + Tailwind 3 + Supabase (Auth/DB/Edge Functions) + Framer Motion + Recharts + Zustand + vite-plugin-pwa. JavaScript puro (sin TypeScript). Sin test runner configurado.

## Skills relevantes al stack

| Skill | Trigger | Path | Source |
|---|---|---|---|
| `supabase` | Cualquier tarea con Supabase: Auth, Database, Edge Functions, RLS, supabase-js, migraciones, auditorías de seguridad, CLI/MCP. | `~/.claude/skills/supabase/` | [supabase/agent-skills](https://skills.sh/supabase/agent-skills) (oficial) |
| `supabase-postgres-best-practices` | Escribir, revisar u optimizar queries Postgres, diseño de schema, índices, configuración de DB. | `~/.claude/skills/supabase-postgres-best-practices/` | [supabase/agent-skills](https://skills.sh/supabase/agent-skills) (oficial) |
| `vercel-react-best-practices` | Escribir, revisar o refactorizar código React para patrones de performance (componentes, hooks, data fetching, bundle). | `~/.claude/skills/vercel-react-best-practices/` | [vercel](https://skills.sh/vercel-labs/agent-skills) |
| `vite` | Configuración de Vite, plugins, SSR, `vite.config.js`, builds de librerías, migración a Vite 8 Rolldown. | `~/.claude/skills/vite/` | [antfu/skills](https://skills.sh/antfu/skills) (core Vite maintainer) |
| `accessibility` | Auditar y mejorar accesibilidad web siguiendo WCAG 2.2: ARIA, contraste, navegación por teclado, screen readers. | `~/.claude/skills/accessibility/` | [addyosmani/web-quality-skills](https://skills.sh/addyosmani/web-quality-skills) |
| `find-skills` | Descubrir e instalar skills nuevas desde el ecosistema cuando surge un gap ("hay una skill para X?"). | `~/.claude/skills/find-skills/` | [vercel-labs/skills](https://skills.sh/vercel-labs/skills) |

## Skills instaladas que NO aplican a este proyecto

Estas están en el entorno global pero no se disparan en Cashé. Las dejo listadas para que sepas por qué no aparecen arriba:

| Skill | Por qué no aplica |
|---|---|
| `prisma-client-api` | Cashé usa Supabase (supabase-js) como cliente, no Prisma. |
| `prisma-database-setup` | Ídem. El setup de DB es vía Supabase Dashboard/migrations. |

## Gaps conocidos (sin skill instalada)

- **Framer Motion**: usado masivamente en `src/components/charts/`. Hay skills community disponibles (~3.5K installs top) pero no se instaló ninguna por ahora.
- **Tailwind CSS**: hay skills community con altas instalaciones (`wshobson/agents@tailwind-design-system`, 36K) pero sin autor oficial Tailwind. Sin instalar.
- **Vitest / React Testing Library**: el proyecto no tiene tests configurados. Si se decide introducir testing, revisar candidatos en `npx skills find vitest`.
- **Zustand / Recharts / PWA-Workbox**: sin skills dedicadas de fuente confiable. Para PWA se usa el agente `mobile-pwa-architect`.

## Cómo actualizar este archivo

Cuando instales o desinstales una skill global, regenerá este archivo. El flujo recomendado está en `~/.claude/CLAUDE.md` (sección "Skills cheatsheet"). Si querés, pedile a Claude que corra el setup de skills y actualice este registry.

# Claude Code - Setup Guide para Cashé

Guía para configurar Claude Code en cualquier PC nueva para trabajar con este proyecto.

---

## Requisitos Previos

```bash
# 1. Node.js 18+ y npm
node -v  # >= 18.x
npm -v

# 2. Git configurado
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# 3. Claude Code CLI instalado
# https://docs.anthropic.com/en/docs/claude-code/overview
npm install -g @anthropic-ai/claude-code

# 4. GitHub CLI (opcional pero recomendado)
# https://cli.github.com/
gh auth login

# 5. Supabase CLI (para edge functions)
npm install -g supabase
supabase login
```

---

## Paso 1: Clonar el Proyecto

```bash
git clone https://github.com/TU_USUARIO/cashe-frontend.git
cd cashe-frontend
npm install
```

---

## Paso 2: Variables de Entorno

Crear `.env.local` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL=https://pqyrbbylglzmcmhlyybc.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
```

> Obtener la anon key desde el dashboard de Supabase > Settings > API.

---

## Paso 3: Configurar MCP Servers

Crear `.mcp.json` en la raíz del proyecto (ya debería estar en el repo):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    },
    "github": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "TU_GITHUB_PAT_AQUI"
      }
    },
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "@playwright/mcp@latest"]
    }
  }
}
```

### Generar GitHub PAT

1. Ir a https://github.com/settings/tokens?type=beta
2. "Generate new token (Fine-grained)"
3. Permisos: `repo`, `read:org`, `workflow`
4. Copiar el token en `.mcp.json`

> **IMPORTANTE**: `.mcp.json` contiene secrets. Verificar que esté en `.gitignore`.

### Para macOS/Linux

Cambiar los commands de MCP:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    },
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "TU_GITHUB_PAT_AQUI"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

---

## Paso 4: Settings de Claude Code (Proyecto)

El archivo `.claude/settings.local.json` ya está en el repo con los permisos configurados. Verificar que incluya:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run dev:*)",
      "Bash(npm run build:*)",
      "Bash(npm install:*)",
      "Bash(npm run deploy:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git branch:*)",
      "Bash(node:*)",
      "Bash(npx supabase:*)",
      "Bash(supabase functions deploy:*)",
      "Bash(supabase secrets set:*)",
      "Bash(gh run:*)",
      "Bash(gh api:*)",
      "Bash(gh workflow:*)",
      "Bash(curl:*)",
      "WebSearch",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:raw.githubusercontent.com)",
      "WebFetch(domain:evilcharts.com)",
      "WebFetch(domain:argentinadatos.com)",
      "mcp__supabase__execute_sql",
      "mcp__supabase__apply_migration",
      "mcp__supabase__list_tables",
      "mcp__supabase__list_edge_functions",
      "mcp__supabase__deploy_edge_function",
      "mcp__supabase__get_edge_function",
      "mcp__supabase__get_logs",
      "mcp__supabase__get_project",
      "mcp__supabase__get_advisors",
      "mcp__supabase__list_projects",
      "mcp__supabase__get_project_url",
      "mcp__supabase__get_publishable_keys",
      "mcp__supabase__list_extensions",
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_click",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_type",
      "mcp__playwright__browser_fill_form",
      "mcp__playwright__browser_evaluate",
      "mcp__playwright__browser_wait_for",
      "mcp__playwright__browser_close",
      "mcp__playwright__browser_resize",
      "mcp__playwright__browser_install",
      "mcp__playwright__browser_console_messages"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["supabase", "github", "playwright"]
}
```

---

## Paso 5: Settings Globales de Claude

En `~/.claude/settings.json` configurar el modelo preferido:

```json
{
  "model": "opus"
}
```

---

## Paso 6: Verificar la Instalación

```bash
# 1. Verificar que el proyecto compila
npm run build

# 2. Iniciar Claude Code
claude

# 3. Dentro de Claude, verificar MCPs
# Escribir: "lista los MCP servers disponibles"
# Debería mostrar: supabase, github, playwright

# 4. Verificar agentes
# Escribir: "qué agentes tengo disponibles?"
# Debería mostrar los 8 agentes

# 5. Verificar skills
# Escribir: "qué skills tengo?"
# Debería mostrar las 6 skills + frontend-design

# 6. Verificar comandos
# Escribir: /verify quick
# Debería correr el build check
```

---

## Estructura de Configuración de Claude

```
cashe-frontend/
├── .mcp.json                          # MCP servers (Supabase, GitHub, Playwright)
├── .env.local                         # Variables de entorno (NO commitear)
├── CLAUDE.md                          # Instrucciones del proyecto (commitear)
├── CLAUDE_SETUP.md                    # Este archivo (commitear)
│
└── .claude/
    ├── settings.local.json            # Permisos del proyecto (commitear)
    │
    ├── agents/                        # Agentes especializados
    │   ├── code-reviewer.md           # Revisión de código (sonnet)
    │   ├── security-reviewer.md       # Seguridad (sonnet)
    │   ├── database-reviewer.md       # PostgreSQL/Supabase (sonnet)
    │   ├── planner.md                 # Planificación (opus)
    │   ├── refactor-cleaner.md        # Limpieza de código (sonnet)
    │   ├── edge-function-dev.md       # Edge Functions WhatsApp/Telegram
    │   ├── mobile-pwa-architect.md    # PWA y mobile UX
    │   └── supabase-cashe.md          # Especialista DB Cashé
    │
    ├── skills/                        # Skills (conocimiento especializado)
    │   ├── frontend-design/SKILL.md   # Diseño UI premium
    │   ├── frontend-patterns/SKILL.md # Patrones React
    │   ├── postgres-patterns/SKILL.md # Patrones PostgreSQL
    │   ├── security-review/SKILL.md   # Checklist seguridad
    │   ├── tdd-workflow/SKILL.md      # Test-driven development
    │   └── verification-loop/SKILL.md # Verificación pre-PR
    │
    └── commands/                      # Slash commands
        ├── code-review.md             # /code-review
        ├── verify.md                  # /verify [quick|full]
        ├── plan.md                    # /plan <feature>
        ├── refactor-clean.md          # /refactor-clean
        ├── test-coverage.md           # /test-coverage
        └── learn.md                   # /learn
```

---

## Referencia Rápida de Uso

### Slash Commands

| Comando | Qué hace | Cuándo usar |
|---------|----------|-------------|
| `/plan` | Plan de implementación detallado | Antes de empezar una feature |
| `/code-review` | Revisión de cambios uncommitted | Antes de commitear |
| `/verify` | Build + security + deps check | Antes de un PR |
| `/verify quick` | Solo build check | Check rápido |
| `/refactor-clean` | Detectar y eliminar código muerto | Mantenimiento |
| `/test-coverage` | Análisis de cobertura de tests | Mejorar tests |
| `/learn` | Extraer patrones a memoria | Cuando resolviste algo interesante |

### Agentes (se invocan automáticamente o con Agent tool)

| Agente | Cuándo se usa |
|--------|---------------|
| `planner` | Features complejas, refactoring grande |
| `code-reviewer` | Después de escribir/modificar código |
| `security-reviewer` | Auth, inputs, datos financieros |
| `database-reviewer` | SQL, migraciones, performance |
| `refactor-cleaner` | Limpieza de código muerto |
| `edge-function-dev` | Bots WhatsApp/Telegram, edge functions |
| `mobile-pwa-architect` | UX mobile, PWA, gestos táctiles |
| `supabase-cashe` | Consultas DB, schema, RLS |

### Skills (se activan automáticamente según contexto)

| Skill | Se activa con... |
|-------|------------------|
| `frontend-design` | Crear componentes UI, páginas, diseño |
| `frontend-patterns` | Hooks, state, performance, React |
| `postgres-patterns` | SQL, indexes, RLS, migraciones |
| `security-review` | Auth, inputs, queries, finanzas |
| `tdd-workflow` | Tests, nuevas features, bug fixes |
| `verification-loop` | Post-feature, pre-PR |

---

## Supabase Edge Functions (Deploy)

```bash
# Linkear proyecto
supabase link --project-ref pqyrbbylglzmcmhlyybc

# Configurar secrets
supabase secrets set WHATSAPP_ACCESS_TOKEN=xxx
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=xxx
supabase secrets set WHATSAPP_VERIFY_TOKEN=xxx
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
supabase secrets set ANTHROPIC_API_KEY=xxx

# Deploy funciones
supabase functions deploy whatsapp-webhook
supabase functions deploy telegram-webhook
```

---

## Troubleshooting

### MCP no conecta
```bash
# Verificar que npx funcione
npx -y @modelcontextprotocol/server-github --help

# En Windows, asegurar que cmd está disponible
where cmd

# Reinstalar playwright MCP si falla
npx playwright install
```

### Supabase MCP pide autenticación
- Al iniciar Claude, el MCP de Supabase pedirá login OAuth
- Seguir el link que aparece en la terminal
- Solo hay que hacerlo una vez por sesión

### Build falla
```bash
# Limpiar cache
rm -rf node_modules/.vite
npm run build
```

### Agentes no aparecen
- Verificar que los archivos `.md` estén en `.claude/agents/`
- Reiniciar Claude Code (`claude` de nuevo)

---

## Notas

- Los archivos en `.claude/` se commitean al repo (excepto secrets)
- `.mcp.json` contiene el GitHub PAT, verificar que esté en `.gitignore`
- La memoria de Claude (`~/.claude/projects/.../memory/`) es local por PC
- `CLAUDE.md` es la fuente de verdad del proyecto, mantenerlo actualizado

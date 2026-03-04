---
description: Run comprehensive verification on current codebase state (build, security, diff review)
---

# Verification Command

Run comprehensive verification on current Cashe codebase state.

## Instructions

Execute verification in this exact order:

1. **Build Check**
   ```bash
   npm run build
   ```
   If it fails, report errors and STOP.

2. **Security Scan**
   - Search for hardcoded secrets (API keys, tokens)
   - Search for console.log statements in src/
   - Check for exposed Supabase credentials

3. **Dependency Audit**
   ```bash
   npm audit --audit-level=high
   ```

4. **Git Status**
   - Show uncommitted changes
   - Show files modified since last commit

5. **Cashe-Specific Checks**
   - New pages have lazy loading in App.jsx
   - New routes in sidebar (Layout.jsx)
   - Cache invalidation for changed data types
   - Dark/light mode support

## Output

```
VERIFICATION: [PASS/FAIL]

Build:     [OK/FAIL]
Security:  [OK/X issues]
Deps:      [OK/X vulnerabilities]
Logs:      [OK/X console.logs]

Ready for PR: [YES/NO]
```

## Arguments

$ARGUMENTS can be:
- `quick` - Only build check
- `full` - All checks (default)
- `pre-commit` - Build + security + console.logs

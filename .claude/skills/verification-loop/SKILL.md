---
name: verification-loop
description: Comprehensive verification system for Cashe. Run after completing a feature, before creating a PR, or after refactoring.
---

# Verification Loop - Cashe

## When to Use

- After completing a feature or significant code change
- Before creating a PR
- After refactoring
- When you want to ensure quality gates pass

## Verification Phases

### Phase 1: Build Verification
```bash
npm run build 2>&1 | tail -20
```
If build fails, STOP and fix before continuing.

### Phase 2: Lint Check
```bash
# Check for ESLint issues if configured
npx eslint src/ --ext .js,.jsx 2>&1 | head -30
```

### Phase 3: Security Scan
```bash
# Check for hardcoded secrets
grep -rn "sk-" --include="*.js" --include="*.jsx" src/ 2>/dev/null | head -10
grep -rn "supabase" --include="*.js" --include="*.jsx" src/ | grep -i "key\|secret\|password" | head -10

# Check for console.log
grep -rn "console.log" --include="*.js" --include="*.jsx" src/ 2>/dev/null | head -20
```

### Phase 4: Dependency Check
```bash
npm audit --audit-level=high 2>&1 | tail -10
```

### Phase 5: Diff Review
```bash
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Missing cache invalidation
- Missing loading/error states

## Output Format

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Lint:      [PASS/FAIL] (X issues)
Security:  [PASS/FAIL] (X issues)
Deps:      [PASS/FAIL] (X vulnerabilities)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Cashe-Specific Checks

- [ ] Cache invalidation correct for changed data types
- [ ] New pages added to App.jsx with lazy loading
- [ ] New routes added to sidebar in Layout.jsx
- [ ] Dark/light mode works for new UI
- [ ] Mobile responsive layout works
- [ ] Supabase RLS covers new tables
- [ ] Currency formatting used for amounts
- [ ] Date formatting uses ISO format

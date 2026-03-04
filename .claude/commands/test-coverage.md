---
description: Analyze test coverage, identify gaps, and generate missing tests
---

# Test Coverage

Analyze test coverage for Cashe, identify gaps, and generate missing tests.

## Instructions

### Step 1: Run Coverage

```bash
npx vitest run --coverage 2>&1 | tail -50
```

If no test runner is configured, set up Vitest first:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Step 2: Analyze Coverage

List files below 80% coverage, sorted worst-first.

For each under-covered file, identify:
- Untested functions
- Missing branch coverage
- Missing edge cases

### Step 3: Prioritize Testing

**High Priority (Cashe-specific):**
- `src/utils/format.js` — Currency and date formatting
- `src/services/supabaseApi.js` — API functions, especially financial calculations
- `src/hooks/` — Custom hooks (useAccounts, useCategories, useDashboard)
- Auto-rules evaluation logic

**Medium Priority:**
- `src/components/forms/` — Form validation
- `src/components/charts/` — Data transformations

### Step 4: Generate Missing Tests

Follow existing patterns and conventions:
- Place tests adjacent to source: `foo.js` → `foo.test.js`
- Use Vitest + React Testing Library
- Mock Supabase client
- Each test should be independent

### Step 5: Verify

1. Run full test suite — all must pass
2. Re-run coverage — verify improvement

### Step 6: Report

```
Coverage Report
──────────────────────────────
File                        Before  After
src/utils/format.js          0%     95%
src/services/supabaseApi.js  0%     45%
──────────────────────────────
Overall:                     X%     Y%
```

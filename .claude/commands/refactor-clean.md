---
description: Safely identify and remove dead code with build verification at every step
---

# Refactor Clean

Safely identify and remove dead code from Cashe.

## Instructions

### Step 1: Detect Dead Code

Use Grep to find:
- Exports with zero imports across the codebase
- Unused components (exported but never imported)
- Unused functions in supabaseApi.js
- Unused npm dependencies

### Step 2: Categorize

| Tier | Examples | Action |
|------|----------|--------|
| **SAFE** | Unused internal functions, unused helpers | Delete with confidence |
| **CAUTION** | Components, API functions | Verify no dynamic imports or lazy loading |
| **DANGER** | Config files, entry points, context providers | Investigate before touching |

### Step 3: Safe Deletion Loop

For each SAFE item:
1. Run `npm run build` — Establish baseline (must pass)
2. Delete the dead code
3. Re-run `npm run build` — Verify nothing broke
4. If build fails — Immediately revert and skip this item
5. If build passes — Move to next item

### Step 4: Consolidate Duplicates

Look for:
- Near-duplicate components (>80% similar)
- Redundant utility functions
- Wrapper functions that add no value

### Step 5: Summary

```
Dead Code Cleanup
──────────────────────────────
Deleted:   X unused functions
           X unused files
           X unused dependencies
Skipped:   X items (build failed)
Saved:     ~X lines removed
──────────────────────────────
Build passing ✅
```

## Rules

- **Never delete without building first**
- **One deletion at a time**
- **Skip if uncertain**
- **Don't refactor while cleaning** (separate concerns)

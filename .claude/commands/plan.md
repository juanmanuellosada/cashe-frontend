---
description: Create a detailed implementation plan before writing code. WAIT for user confirmation before coding.
---

# Plan Command

Invoke the **planner** agent to create a comprehensive implementation plan before writing any code.

## Instructions

1. **Restate Requirements** - Clarify what needs to be built
2. **Analyze Codebase** - Review affected files and existing patterns
3. **Create Step Plan** - Break down into phases with file paths
4. **Identify Cache Strategy** - Which cache keys to invalidate, which DataEvents
5. **Consider Cashe Conventions** - Dark/light mode, mobile-first, currency format, Supabase RLS
6. **Wait for Confirmation** - MUST receive user approval before proceeding

## Plan Format

```markdown
# Plan: [Feature Name]

## Overview
[2-3 sentences]

## Affected Files
- [file paths]

## Implementation Phases

### Phase 1: [Name]
1. Step with specific file path and action
2. ...

### Phase 2: [Name]
...

## Cache Strategy
- Invalidation keys: [...]
- DataEvents: [...]

## Risks
- [Risk and mitigation]

## Success Criteria
- [ ] ...
```

**CRITICAL**: Do NOT write any code until the user explicitly confirms the plan.

## Arguments

$ARGUMENTS: Description of the feature or change to plan.

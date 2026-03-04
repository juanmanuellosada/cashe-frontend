---
name: tdd-workflow
description: Test-driven development workflow for Cashe. Use when writing new features, fixing bugs, or refactoring. Enforces tests-first approach.
---

# TDD Workflow - Cashe

## When to Activate

- Writing new features or functionality
- Fixing bugs
- Refactoring existing code
- Adding new API functions to supabaseApi.js

## TDD Cycle

```
RED → GREEN → REFACTOR → REPEAT

RED:      Write a failing test
GREEN:    Write minimal code to pass
REFACTOR: Improve code, keep tests passing
```

## Cashe Testing Patterns

### Unit Test (Vitest)
```javascript
import { describe, it, expect, vi } from 'vitest'
import { formatCurrency, formatDate } from '../utils/format'

describe('formatCurrency', () => {
  it('formats ARS amounts correctly', () => {
    expect(formatCurrency(5000, 'ARS')).toBe('$5.000')
  })

  it('formats USD amounts correctly', () => {
    expect(formatCurrency(100.50, 'USD')).toBe('US$100,50')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'ARS')).toBe('$0')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-1500, 'ARS')).toBe('-$1.500')
  })
})
```

### Component Test
```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import { MovementCard } from './MovementCard'

describe('MovementCard', () => {
  const mockMovement = {
    id: '1',
    type: 'expense',
    amount: 5000,
    note: 'Supermercado',
    date: '2025-01-15',
    categoryName: 'Supermercado',
    categoryIcon: '🛒'
  }

  it('renders movement details', () => {
    render(<MovementCard movement={mockMovement} />)
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('$5.000')).toBeInTheDocument()
  })

  it('shows expense in red', () => {
    render(<MovementCard movement={mockMovement} />)
    const amount = screen.getByText('$5.000')
    expect(amount).toHaveClass('text-red')
  })
})
```

### Mocking Supabase
```javascript
vi.mock('../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ id: '1', name: 'Test Account' }],
          error: null
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }
}))
```

## Test File Organization

```
src/
├── utils/
│   ├── format.js
│   └── format.test.js
├── services/
│   ├── supabaseApi.js
│   └── supabaseApi.test.js
├── hooks/
│   ├── useAccounts.js
│   └── useAccounts.test.js
└── components/
    ├── MovementsList.jsx
    └── MovementsList.test.jsx
```

## What to Test

### Always Test
- Utility functions (format.js)
- Financial calculations (amounts, currency conversion)
- Cache invalidation logic
- Form validation logic
- Auto-rules evaluation logic

### Test When Possible
- React hooks (useAccounts, useCategories, useDashboard)
- Component rendering and interactions
- API function error handling

## Common Mistakes to Avoid

- Testing implementation details instead of behavior
- Using brittle CSS selectors instead of data-testid
- Tests depending on each other (no isolation)
- Mocking everything (prefer integration tests where possible)

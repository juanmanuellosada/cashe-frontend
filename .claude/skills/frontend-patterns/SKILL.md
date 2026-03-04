---
name: frontend-patterns
description: React frontend patterns for components, hooks, state management, performance, and accessibility. Reference for Cashe development.
---

# Frontend Patterns - Cashe (React 18 + Vite)

## When to Activate

- Building React components
- Managing state (useState, useReducer, Context)
- Optimizing performance (memoization, lazy loading)
- Working with forms (validation, controlled inputs)
- Handling animations (Framer Motion)
- Implementing accessibility patterns

## Component Patterns

### Composition Over Inheritance
```jsx
// Cashe uses this pattern in ui/Card.jsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Custom Hooks Pattern
```jsx
// Follow existing hook patterns: useAccounts, useCategories, useDashboard
export function useMyFeature() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData().then(setData).catch(setError).finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
```

### Debounce Hook (already in project)
```jsx
// Used in auto-rules evaluation (400ms debounce)
const debouncedQuery = useDebounce(searchQuery, 400)
```

## State Management

### Context Pattern (existing in Cashe)
```jsx
// AuthContext pattern - follow for new global state
const MyContext = createContext(undefined)

export function MyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <MyContext.Provider value={{ state, dispatch }}>
      {children}
    </MyContext.Provider>
  )
}

export function useMyContext() {
  const context = useContext(MyContext)
  if (!context) throw new Error('useMyContext must be used within MyProvider')
  return context
}
```

## Performance Optimization

### Memoization
```jsx
// useMemo for expensive computations (sorting, filtering movements)
const sortedMovements = useMemo(() =>
  movements.sort((a, b) => new Date(b.date) - new Date(a.date)),
  [movements]
)

// useCallback for functions passed to children
const handleSearch = useCallback((query) => setSearchQuery(query), [])

// React.memo for pure components
export const MovementCard = React.memo(({ movement }) => { ... })
```

### Code Splitting (Cashe pattern)
```jsx
// App.jsx uses React.lazy for all protected routes
const Statistics = lazy(() => import('./pages/Statistics'))

// Wrap in Suspense with LoadingSpinner
<Suspense fallback={<LoadingSpinner />}>
  <Statistics />
</Suspense>
```

## Form Handling (Cashe pattern)

```jsx
// Follow MovementForm.jsx pattern with tabs
// IncomeForm, ExpenseForm, TransferForm are separate components
// Use controlled inputs with onChange handlers
// Validate before submit
const validate = () => {
  const errors = {}
  if (!amount || amount <= 0) errors.amount = 'Monto requerido'
  if (!accountId) errors.account = 'Cuenta requerida'
  return errors
}
```

## Animation Patterns (Framer Motion)

```jsx
// Use AnimatedChart wrapper from charts/AnimatedChart.jsx
<AnimatedChart delay={0.1}>
  <MyChart data={data} />
</AnimatedChart>

// List animations
<AnimatePresence>
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <ItemCard item={item} />
    </motion.div>
  ))}
</AnimatePresence>
```

## Accessibility

### Keyboard Navigation
- Support `Alt+K` for search (SearchButton.jsx)
- Support `N` for new movement
- Support `Escape` to close modals
- All interactive elements must be keyboard accessible

### ARIA Attributes
```jsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Modal Title</h2>
</div>
```

## Cashe-Specific Conventions

1. **CSS Variables**: Use `var(--bg-card)`, `var(--text-primary)` etc for theming
2. **Currency Format**: Use `formatCurrency()` from `utils/format.js`
3. **Date Format**: ISO `yyyy-mm-dd`, display with `date-fns`
4. **Icons**: Lucide React for UI icons, emojis for categories
5. **Toasts**: Use Toast component for notifications
6. **Loading**: Use LoadingSpinner for loading states
7. **Empty States**: Always handle empty data gracefully

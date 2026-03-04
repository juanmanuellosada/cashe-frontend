---
name: security-review
description: Use this skill when adding authentication, handling user input, working with Supabase queries, or implementing financial features. Provides comprehensive security checklist.
---

# Security Review Skill - Cashe

## When to Activate

- Handling user input (forms, search, filters)
- Writing Supabase queries or RPC functions
- Modifying authentication flow (AuthContext)
- Working with financial amounts
- Creating Edge Functions (WhatsApp/Telegram bots)
- Integrating third-party APIs (dolarapi.com)

## Security Checklist

### 1. Secrets Management
- [ ] No hardcoded Supabase URL or anon key in source (use import.meta.env)
- [ ] .env.local in .gitignore
- [ ] Edge function secrets via `supabase secrets set`
- [ ] No ANTHROPIC_API_KEY or WHATSAPP_ACCESS_TOKEN in code

### 2. Input Validation
- [ ] Amount fields validated (> 0, numeric, reasonable max)
- [ ] Date fields validated (ISO format yyyy-mm-dd)
- [ ] Note/description fields sanitized
- [ ] Account/category IDs validated as UUIDs
- [ ] File uploads restricted if any

### 3. Supabase Query Safety
```javascript
// NEVER: String concatenation
const { data } = await supabase.from('movements').select('*').filter('note', 'eq', userInput)

// ALWAYS: Use Supabase client methods (auto-parameterized)
const { data } = await supabase.from('movements').select('*').eq('user_id', userId)
```

### 4. Authentication & RLS
- [ ] All API calls go through authenticated Supabase client
- [ ] getUserId() called before mutations
- [ ] RLS enabled on ALL tables
- [ ] ProtectedRoute wraps all auth-required pages
- [ ] Session expiry handled (SessionExpiryWarning)

### 5. XSS Prevention
- [ ] React JSX auto-escapes by default (don't bypass with dangerouslySetInnerHTML)
- [ ] User notes/descriptions rendered as text content
- [ ] No eval() or Function() with user data

### 6. Financial Data Security
- [ ] Amounts stored as numeric (not float)
- [ ] Currency conversions use proper decimal handling
- [ ] Balance calculations server-side (RPC) when critical
- [ ] No financial data in console.log
- [ ] Error messages don't expose account details

### 7. Edge Function Security
- [ ] Webhook signatures verified (WhatsApp, Telegram)
- [ ] Auth tokens validated in edge functions
- [ ] Rate limiting on bot interactions
- [ ] User input from WhatsApp/Telegram sanitized before DB operations

## Pre-Commit Checklist

- [ ] No `console.log` with sensitive data
- [ ] No hardcoded secrets
- [ ] All Supabase queries use client methods
- [ ] RLS policies cover new tables
- [ ] getUserId() before all mutations

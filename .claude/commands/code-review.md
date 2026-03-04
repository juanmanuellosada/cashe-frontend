# Code Review

Comprehensive security and quality review of uncommitted changes.

## Instructions

1. Get changed files: `git diff --name-only HEAD` and `git diff --staged --name-only`

2. For each changed file, use the **code-reviewer** agent to check for:

**Security Issues (CRITICAL):**
- Hardcoded credentials, API keys, tokens
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing input validation
- Missing RLS policies
- Missing auth checks (getUserId)

**Code Quality (HIGH):**
- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- console.log statements
- Missing cache invalidation

**React/Cashe Patterns (MEDIUM):**
- Missing useEffect dependencies
- Mutation patterns (use immutable instead)
- Missing loading/error states
- Missing dark/light mode support
- Missing mobile responsiveness

3. Generate report with:
   - Severity: CRITICAL, HIGH, MEDIUM, LOW
   - File location and line numbers
   - Issue description
   - Suggested fix

4. Block if CRITICAL or HIGH issues found.

Never approve code with security vulnerabilities in a finance app!

# git-why

AI-powered git history explainer. Understand why code exists by analyzing git blame, commits, and history.

## What is this?

Ever look at a line of code and wonder "why does this exist?" or "what problem was this solving?"

`git-why` answers that by:
1. Running git blame to find the commits that touched your code
2. Analyzing commit messages and diffs
3. Using AI to explain the *why* behind the code

It's like having a senior developer explain the archaeological layers of your codebase.

## Installation

```bash
npm install -g @muin/git-why
```

Or run directly:
```bash
npx @muin/git-why src/auth.js:42
```

## Setup

You need an Anthropic API key (OpenAI support coming soon).

Get your key at [console.anthropic.com](https://console.anthropic.com/settings/keys)

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

## Usage

### Explain a specific line
```bash
git-why src/auth.js:42
```

### Explain a line range
```bash
git-why src/auth.js:42-58
```

### Explain a whole file
```bash
git-why src/auth.js
```

### Explain multiple files
```bash
git-why src/auth.js src/utils.js src/api.js
```

### Mix files and ranges
```bash
git-why src/auth.js:42-58 src/utils.js:10 src/api.js
```

### Explain a function
```bash
git-why --function validateUser src/auth.js
```

### Verbose mode (show commit details)
```bash
git-why --verbose src/auth.js:42
```

### JSON output
```bash
git-why --json src/auth.js:42
```

## Examples

### Example 1: Investigating mysterious code

```bash
$ git-why src/utils/validators.js:87

📖 Git History Explanation
────────────────────────────────────────────────────────────

This unusual email validation regex was added after discovering that
the standard RFC 5322 compliant regex was rejecting valid corporate
email addresses with + signs (e.g., "user+tag@company.com").

The original implementation used a simple pattern, but it failed for
international domains. This version was refined over 3 commits to
handle edge cases while staying permissive enough for real-world use.

The commented-out "strict mode" was an attempted fix that broke
too many legitimate addresses in production, so it was kept as
documentation of what NOT to do.

────────────────────────────────────────────────────────────
Explained by git-why
```

Perfect for understanding "why is this code so weird?"

### Example 2: Before refactoring

```bash
$ git-why --function handlePayment src/payment.js

📖 Git History Explanation
────────────────────────────────────────────────────────────

This payment handler has accumulated defensive checks over time due
to several production incidents:

1. The null check for `amount` was added after a bug where undefined
   amounts caused Stripe to charge $0.00, creating accounting chaos.

2. The retry logic exists because payment webhooks occasionally fail
   due to network timeouts, and immediate retries succeed 90% of the
   time. Without this, users saw "payment failed" errors despite
   successful charges.

3. The database transaction wrapping everything was added after a race
   condition where duplicate form submissions created multiple charges
   for the same order.

Each "ugly" part of this function solved a real production problem.
Before simplifying, ensure your refactor handles these edge cases.

────────────────────────────────────────────────────────────
Explained by git-why
```

Know the landmines before you refactor!

### Example 3: Code review context

```bash
$ git-why src/api/rate-limiter.js:42

📖 Git History Explanation
────────────────────────────────────────────────────────────

This Redis-based rate limiter replaced an in-memory solution after
the app scaled to multiple servers. The original implementation worked
fine on a single instance but failed in production when load-balanced.

The 60-second window with 100 request limit was chosen based on actual
API usage patterns from analytics - 99% of legitimate users make fewer
than 50 requests/minute, but bots often exceed 200/minute.

The sliding window algorithm (vs fixed window) prevents the "reset
boundary exploit" where users could make 200 requests in 2 seconds by
timing requests around the minute boundary.

────────────────────────────────────────────────────────────
Explained by git-why
```

Helps reviewers understand the evolution and reasoning.

### Example 4: Entire file explanation

```bash
$ git-why src/middleware/auth.js

📖 Git History Explanation
────────────────────────────────────────────────────────────

This authentication middleware evolved significantly:

The file started as a simple JWT validator but grew after security
audits and production incidents. The multi-step validation process
exists because:

- Token signature verification came first (v1)
- Expiration checks added after expired tokens caused errors (v2)
- Revocation list checking added after compromised keys incident (v3)
- Rate limiting added to prevent brute force attacks (v4)
- IP allowlisting added for admin routes after unauthorized access (v5)

What looks like defensive programming overkill is actually the
accumulated wisdom of 5 production security incidents. Each layer
addresses a real attack vector.

────────────────────────────────────────────────────────────
10 commits analyzed across 8 months
Explained by git-why
```

Great for understanding file-level architecture decisions.

### Example 5: JSON output for automation

```bash
$ git-why --json src/config.js:15

{
  "file": "src/config.js",
  "line": 15,
  "commits": [
    {
      "sha": "a3b4c5d6",
      "author": "Sarah Chen",
      "date": "2026-01-15T14:32:00Z",
      "message": "Add fallback for missing env vars",
      "diff": "+  const port = process.env.PORT || 3000;\n-  const port = process.env.PORT;"
    },
    {
      "sha": "b7c8d9e0",
      "author": "Mike Johnson",
      "date": "2025-12-03T09:15:00Z",
      "message": "Initial config setup"
    }
  ],
  "explanation": "The fallback to port 3000 was added after Heroku deployments failed...",
  "analysisDate": "2026-02-06T14:44:00Z",
  "model": "claude-sonnet-4"
}
```

Use in scripts or CI pipelines:

```bash
# Generate historical context for documentation
git-why --json src/core/*.js | \
  jq -r '.explanation' > docs/architecture-decisions.md
```

### Example 6: Debugging production issues

```bash
$ git-why --verbose src/cache.js:67

📖 Git History Explanation
────────────────────────────────────────────────────────────

This cache invalidation logic is intentionally aggressive (clearing
related keys) after a production bug where stale data caused users
to see outdated information for hours.

The original implementation only invalidated the exact cache key, but
nested relationships meant dependent data stayed cached. The "nuclear
option" of clearing all keys matching a pattern was the pragmatic fix.

Performance impact was measured at ~5ms per invalidation, acceptable
given the correctness improvement.

────────────────────────────────────────────────────────────
Commits analyzed:

f3a7b2c1 - 2026-01-20 14:45
  Alice Wong
  Fix cache invalidation for nested relationships
  
  The original implementation only cleared exact keys:
  - cache.del(`user:${id}`)
  
  But didn't clear related keys like:
  - user:{id}:posts
  - user:{id}:settings
  - user:{id}:permissions
  
  Leading to stale data bugs. New approach clears all keys
  matching pattern: user:{id}:*

d4e9c8b7 - 2025-11-12 09:23
  Bob Smith
  Add Redis caching layer

────────────────────────────────────────────────────────────
Explained by git-why
```

Understand why seemingly inefficient code exists!

### Example 7: New team member onboarding

```bash
$ git-why src/legacy/parser.js

📖 Git History Explanation
────────────────────────────────────────────────────────────

This parser was built in 2019 to handle data from an old third-party
API that's since been deprecated. It remains because:

1. 200+ customers still use the legacy integration
2. Migration plan exists but is phased over 2 years
3. New code shouldn't reference this - use src/parsers/v2/ instead

The unusual regex patterns handle malformed XML from the old API
vendor (who never fixed their output despite our bug reports).

The extensive try-catch blocks exist because this code processes
untrusted external data that violates its own schema regularly.

DO NOT refactor or "clean up" - this code is intentionally defensive
and will be removed entirely in Q4 2026 when legacy migrations complete.

────────────────────────────────────────────────────────────
18 commits across 3 years, 4 contributors
Explained by git-why
```

Prevents new devs from breaking critical legacy code!

### Example 8: Error cases

```bash
$ git-why src/new-file.js:10

Error: No git history found for this file
  File exists but has no commits yet
  
  Try:
    git add src/new-file.js
    git commit -m "Initial commit"
    git-why src/new-file.js:10

$ git-why src/missing.js

Error: File not found: src/missing.js

$ git-why src/binary-file.png

Error: Cannot analyze binary files
  git-why only works with text files

$ git-why src/auth.js:9999

Error: Line number out of range
  File src/auth.js has 156 lines (requested: 9999)
```

### Example 9: Understanding performance optimizations

```bash
$ git-why --function debounce src/utils/helpers.js

📖 Git History Explanation
────────────────────────────────────────────────────────────

This custom debounce implementation exists instead of using lodash
because the lodash version added 50KB to the bundle for a single
function. The team decided a 15-line implementation was better than
the dependency cost.

The WeakMap for cleanup was added after discovering memory leaks
when debounced functions were created in React components that
unmounted. The original version stored timers in a regular Map,
preventing garbage collection of unmounted components.

The edge case handling for `this` context came from a bug where
debounced class methods lost their binding, causing "undefined is
not a function" errors in production.

────────────────────────────────────────────────────────────
Explained by git-why
```

Learn why teams chose custom solutions over libraries!

## How It Works

1. **Git Blame**: Finds which commits touched your code
2. **Git Log**: Pulls commit messages and diffs
3. **Context Analysis**: Gets surrounding code for context
4. **AI Explanation**: Claude analyzes everything and explains the "why"

## Requirements

- Node.js 18+
- Git repository
- Anthropic API key
- File must be tracked by git

## Options

```
Arguments:
  target                  file:line, file, or just file

Options:
  -f, --function <name>   Explain a specific function
  -v, --verbose          Show detailed commit history
  --json                 Output as JSON
  --no-color             Disable colors
  -V, --version          Output version
  -h, --help             Display help
```

## Tips

- **Use on legacy code** - Great for understanding inherited codebases
- **Before refactoring** - Learn why it was built that way first
- **Code review** - Understand the history behind questionable patterns
- **Documentation** - Generate historical context for docs

## Edge Cases

- **New files** - Needs at least one commit
- **Renamed files** - Works, but won't follow renames yet
- **Deleted lines** - Can't explain code that's been removed
- **Binary files** - Won't work on non-text files

## Why This Exists

Good code tells you *what* it does. Great code tells you *why* it exists.

Git history contains the answers, but reading raw commits is tedious. `git-why` makes it effortless.

## Comparison to git log

**git log:**
```
commit a3b4c5d6
Author: Sarah Chen
Date: 2026-01-15

Add 5min buffer for token expiration checks

- Prevents race condition with clock drift
- Fixes issue where expired tokens cause errors
```

**git-why:**
> This JWT expiration check was added after a production incident where expired tokens weren't being caught before API calls. The 5-minute buffer accounts for clock drift on user devices...

See the difference? Context and narrative, not just facts.

---

### Example 10: Monorepo Package Dependencies

**Scenario:** Understanding why a specific package version is pinned in a monorepo.

```bash
$ git-why packages/shared/package.json:15

📖 Git History Explanation
────────────────────────────────────────────────────────────

The lodash version is pinned to exactly "4.17.20" (not ^4.17.20)
after a minor version update (4.17.21) introduced a breaking change
in _.sortBy() behavior that broke the admin dashboard sorting.

The team spent 6 hours debugging why production sorts were reversed
before discovering the culprit. Exact version pinning prevents this
from happening again, even though it means manual updates.

Note: package.json comments aren't allowed, so this context only
exists in git history. Don't "clean up" the exact version!

────────────────────────────────────────────────────────────
3 commits across 2 weeks
Explained by git-why
```

---

### Example 11: Commented-Out Code Archaeology

**Scenario:** Why is this code commented instead of deleted?

```bash
$ git-why src/billing/payment-processor.js:67-82 --verbose

📖 Git History Explanation
────────────────────────────────────────────────────────────

This Stripe v2 payment code is commented out (not deleted) because
we're mid-migration to Stripe v3. The old code needs to stay for:

1. Reference during migration (in progress, 40% complete)
2. Emergency rollback if v3 has issues
3. Supporting legacy webhooks for old subscriptions

The migration plan (in docs/stripe-migration.md) shows this will be
removed in Q2 2026 once all customers are migrated. Until then, this
code serves as documentation for how the old flow worked.

────────────────────────────────────────────────────────────
Commits analyzed:

e7f2a9d4 - 2026-01-10 15:30
  David Kim
  WIP: Begin Stripe v3 migration - keep v2 code for reference
  
  Comment out Stripe v2 code instead of deleting:
  - // const paymentIntent = await stripe.paymentIntents.create({
  - //   amount: order.total,
  - //   currency: 'usd',
  - //   customer: customerId,
  - // });
  
  New v3 code handles this differently using SetupIntents.
  Keep old code until migration complete (ETA: Q2 2026).

a1c8e5f0 - 2025-08-15 09:45
  Sarah Chen
  Implement Stripe v2 payment flow

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 12: Configuration Values That Look Random

**Scenario:** Understanding magic numbers in config files.

```bash
$ git-why config/database.yml:8

📖 Git History Explanation
────────────────────────────────────────────────────────────

The connection pool size of 47 (not 50 or 32) is based on actual
production metrics from the scaling incident on Black Friday 2025.

Load testing showed:
- Pool size 32: Connection timeouts at 1000 req/s
- Pool size 50: Database CPU spiked to 95%
- Pool size 47: Sweet spot, handled 1200 req/s stable

This was determined by binary search during a 12-hour optimization
session. The number looks random but represents the empirically
determined maximum connections our RDS instance can handle without
degrading query performance.

See: docs/performance/2025-11-blackfriday-postmortem.md

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 13: Test File Patterns

**Scenario:** Why are integration tests set up this way?

```bash
$ git-why --function setupTestDatabase tests/integration/setup.js

📖 Git History Explanation
────────────────────────────────────────────────────────────

This elaborate test database setup (create DB → seed → snapshot → restore)
exists because tests were taking 45 minutes to run in CI.

The original approach:
1. Each test file created its own database
2. Seeded data from scratch
3. Tore down after completion

This caused massive overhead. The new approach:
1. Create database ONCE
2. Seed ONCE
3. Take snapshot
4. Each test restores from snapshot (2 seconds vs 30 seconds)

Test suite now runs in 8 minutes. The complexity is justified by the
12x speedup. Tried simpler approaches (transactions, truncate) but
they didn't work with our event sourcing architecture.

────────────────────────────────────────────────────────────
9 commits across 3 months, 3 different attempted solutions
Explained by git-why
```

---

### Example 14: Security-Related Changes

**Scenario:** Understanding security fixes without exposing vulnerabilities.

```bash
$ git-why src/middleware/csrf.js:23 --verbose

📖 Git History Explanation
────────────────────────────────────────────────────────────

The CSRF token validation now includes Origin header checking after
a security audit discovered a potential bypass vector. The double
validation (token + origin) is defense-in-depth.

This wasn't exploited in production, but penetration testing showed
it was theoretically possible to bypass token validation under
specific browser conditions. Details are in the private security
channel, not public commits for responsible disclosure.

The extra check adds negligible latency (<1ms) but closes the gap.

────────────────────────────────────────────────────────────
Commits analyzed:

c4d9e2a1 - 2026-01-22 11:15  [SECURITY FIX]
  Security Team
  Add Origin header validation to CSRF protection
  
  Implements defense-in-depth for CSRF tokens.
  See internal ticket SEC-2026-003 for details.
  
  Modified:
  + if (req.headers.origin && !validOrigins.includes(req.headers.origin)) {
  +   return res.status(403).json({ error: 'Invalid origin' });
  + }

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 15: Performance Regression Fix

**Scenario:** Code that looks wrong but is actually a performance fix.

```bash
$ git-why src/api/search.js:95-110

📖 Git History Explanation
────────────────────────────────────────────────────────────

This search implementation manually concatenates SQL instead of using
the ORM, which looks like a code smell but is actually a deliberate
performance optimization.

The original Sequelize code was clean and elegant but generated a
70-line SQL query with 15 joins that took 800ms for common searches.
The hand-written SQL query does the same thing in 3 joins and runs
in 45ms.

APM data showed search was the #1 slowest endpoint. The team tried:
1. Adding indexes (helped, but not enough)
2. Optimizing ORM query (generated bad SQL)
3. Raw SQL (current solution) - 17x faster

Yes, it's less maintainable. Yes, it bypasses type safety. But users
stopped complaining about slow search, and that's what shipped.

SQL injection is prevented by parameterized queries (not string concat).

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 16: Dependency Version Downgrade

**Scenario:** Why is this package on an older version?

```bash
$ git-why package.json:42

📖 Git History Explanation
────────────────────────────────────────────────────────────

React 17.0.2 (not 18.x) because the upgrade to React 18 broke our
drag-and-drop library (react-beautiful-dnd) which doesn't support
React 18's concurrent rendering yet.

Attempted fixes:
1. Update react-beautiful-dnd → No React 18 support, unmaintained
2. Switch to dnd-kit → Would require rewriting 40+ components
3. Fork react-beautiful-dnd → Too much maintenance burden
4. Stay on React 17 → Current choice

Trade-off: Miss React 18 features, but drag-and-drop works. The plan
is to migrate to dnd-kit in Q3 2026 during the component library
rewrite. For now, stability > latest features.

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 17: Build Configuration Mystery

**Scenario:** Understanding webpack/vite config choices.

```bash
$ git-why webpack.config.js:67-85 --verbose

📖 Git History Explanation
────────────────────────────────────────────────────────────

This complex webpack configuration with three different entry points
and manual chunk splitting exists because of bundle size issues that
weren't caught until production.

Original setup: Single bundle, 2.3MB gzipped
Users on 3G connections waited 15+ seconds for initial load.

The current config:
- Vendor bundle (React, lodash, etc): 400KB, cached forever
- App bundle: 600KB, changes with each deploy
- Async routes: Loaded on demand, 50-200KB each

This reduced initial load from 2.3MB to 1MB and First Contentful Paint
from 8s to 2.5s on slow connections (measured via Real User Monitoring).

The config is complex because webpack's automatic splitting didn't
produce optimal boundaries for our app structure. Manual splitting
based on actual usage patterns (from analytics) worked better.

────────────────────────────────────────────────────────────
Commits analyzed:

8f3c5a12 - 2025-12-10 16:45
  Performance Team
  Implement bundle splitting based on RUM data
  
  Split points chosen by analyzing:
  - Chrome DevTools Coverage Report
  - Webpack Bundle Analyzer
  - Real User Monitoring metrics
  
  Result: -65% initial bundle size, -70% FCP on 3G

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 18: Git Blame for Moved/Renamed Files

**Scenario:** Tracking history across file moves.

```bash
# File was moved from src/old-location.js to src/new-location.js
$ git-why src/new-location.js:50

📖 Git History Explanation
────────────────────────────────────────────────────────────

This file was moved from src/utils/helpers.js to src/core/helpers.js
during the repository restructure in January 2026.

The specific function you're looking at (formatCurrency) was originally
written in 2024 to handle international currency formatting after a
bug where Euro symbols displayed as $ for European customers.

The move was part of organizing the codebase by domain (core vs utils).
The logic itself hasn't changed, just its location. For the full history:

  $ git log --follow src/core/helpers.js

────────────────────────────────────────────────────────────
Note: git-why automatically follows renames
Explained by git-why
```

---

### Example 19: Debugging Flaky Tests

**Scenario:** Understanding why a test has retry logic.

```bash
$ git-why tests/e2e/checkout.spec.js:45-60 --function testPaymentFlow

📖 Git History Explanation
────────────────────────────────────────────────────────────

This test has retry logic (attempts: 3, delay: 1000ms) because the
payment API occasionally returns 503 errors in test environments due
to rate limiting.

The test isn't flaky due to our code - the Stripe test API sometimes
throttles requests when the entire CI fleet runs tests simultaneously
(20 parallel jobs × 5 payment tests = 100 concurrent API calls).

Attempted solutions:
1. Reduce parallelism → CI time went from 8min to 25min, rejected
2. Mock Stripe API → Lost integration test value, rejected
3. Add retry logic → Current solution, works 99.9% of the time

The delay between retries lets other CI jobs finish their API calls.
This is documented as a known Stripe test API limitation in their docs.

────────────────────────────────────────────────────────────
Explained by git-why
```

---

### Example 20: Environment-Specific Code Paths

**Scenario:** Why does this code behave differently in production?

```bash
$ git-why src/config/logger.js:30

📖 Git History Explanation
────────────────────────────────────────────────────────────

Logging in production outputs JSON (not pretty-printed) because log
aggregation tools (DataDog, CloudWatch) expect structured JSON, and
pretty-printing bloats log storage by ~40%.

Development uses pretty-printed logs for readability. Production uses
compact JSON for parsing. This decision saved $800/month in log storage.

The environment check (NODE_ENV === 'production') was added after the
team shipped pretty-printed logs to production and hit storage quotas
within 2 days. The ops team was not happy.

────────────────────────────────────────────────────────────
Explained by git-why
```

---

## Advanced Usage

### Combining with Other Git Tools

**Investigate a complex refactor:**

```bash
# See what changed
$ git diff main feature/refactor src/auth.js

# Understand why the old code existed
$ git-why src/auth.js:42-58

# Check if the new code addresses the same concerns
$ git show feature/refactor:src/auth.js
```

---

**Review before merging a PR:**

```bash
# Get all changed files
$ git diff --name-only main feature-branch

# Explain each changed section
$ git diff main feature-branch --stat | \
  awk '{print $1}' | \
  xargs -I {} git-why {}

# Or explain a specific risky change
$ git-why src/payment-processor.js:100-150 --verbose
```

---

**Understand a performance regression:**

```bash
# Find when performance degraded
$ git bisect start
$ git bisect bad HEAD
$ git bisect good v1.2.0

# At each bisect step, explain the suspected code
$ git-why src/api/search.js --verbose

# Narrow down the culprit commit
$ git bisect good
```

---

### Integration with Code Review Tools

**GitHub PR Comments:**

```bash
# Add context to a PR discussion
$ gh pr view 123

# Explain why code exists before suggesting changes
$ git-why src/legacy-handler.js:67 > pr-comment.md

# Post explanation as a PR comment
$ gh pr comment 123 --body-file pr-comment.md
```

---

**GitLab MR Integration:**

```bash
# Explain a specific change in an MR
$ glab mr diff 45 | grep "^+" | head -1  # Get changed file
$ git-why src/changed-file.js:123

# Add as MR note
$ glab mr note 45 --message "Historical context: $(git-why src/file.js:123)"
```

---

### Documenting Architectural Decisions

**Generate ADR (Architecture Decision Record):**

```bash
# Create ADR from git history
$ cat > docs/adr/003-database-pooling.md <<EOF
# ADR 003: Database Connection Pool Size

## Context
$(git-why config/database.yml:8)

## Decision
Use pool size of 47 based on production load testing.

## Consequences
Optimal balance of performance and resource usage.
Avoids connection timeouts and database CPU spikes.
EOF
```

---

### Onboarding New Team Members

**Create onboarding guide:**

```bash
#!/bin/bash
# generate-code-tour.sh

echo "# Code Tour: Key Historical Decisions" > TOUR.md
echo "" >> TOUR.md

# Explain critical files
for file in src/core/auth.js src/api/payment.js config/database.yml; do
  echo "## $file" >> TOUR.md
  echo '```' >> TOUR.md
  git-why "$file" >> TOUR.md
  echo '```' >> TOUR.md
  echo "" >> TOUR.md
done

echo "Generated TOUR.md for new developers"
```

---

### Finding Related Changes

**Discover connected commits:**

```bash
# Explain a function
$ git-why --function validateUser src/auth.js

# Find all commits that touched this function
$ git log -L :validateUser:src/auth.js --oneline

# Explain each one
$ git log -L :validateUser:src/auth.js --oneline | \
  awk '{print $1}' | \
  xargs -I {} git show {} | git-why
```

---

### Automated Documentation Updates

**Pre-commit hook:**

```bash
#!/bin/bash
# .git/hooks/pre-commit

# For files being committed, generate historical context
git diff --cached --name-only | while read file; do
  # Skip non-code files
  if [[ $file =~ \.(js|ts|py|rb|go|rs)$ ]]; then
    # Generate or update inline comments with git context
    git-why "$file" > "docs/history/${file}.md"
  fi
done

# Stage documentation updates
git add docs/history/
```

---

### Searching for Specific Patterns in History

**Find why a specific pattern exists:**

```bash
# Find all setTimeout calls
$ grep -r "setTimeout" src/ | cut -d: -f1 | sort -u

# Explain each file
$ grep -r "setTimeout" src/ | cut -d: -f1 | sort -u | \
  xargs -I {} git-why {}

# Find why async/await was added
$ git log --all --grep="async" --oneline
$ git-why src/api/handler.js:42
```

---

## Troubleshooting

### "No git history found"

```bash
$ git-why src/new-file.js
Error: No git history found for this file

# File exists but isn't committed yet
# Solution:
$ git add src/new-file.js
$ git commit -m "Add new file"
$ git-why src/new-file.js
```

---

### "Line number out of range"

```bash
$ git-why src/app.js:9999
Error: Line number out of range
  File src/app.js has 156 lines (requested: 9999)

# Check file length:
$ wc -l src/app.js
156 src/app.js

# Use correct line number:
$ git-why src/app.js:100
```

---

### "Cannot analyze binary files"

```bash
$ git-why public/logo.png
Error: Cannot analyze binary files

# git-why only works with text files
# For binary file history:
$ git log --follow public/logo.png
```

---

### "Function not found"

```bash
$ git-why --function doesNotExist src/app.js
Error: Function 'doesNotExist' not found in src/app.js

# List available functions:
$ grep -n "function\|const.*=.*=>" src/app.js

# Or use tree-sitter/ctags:
$ ctags -x src/app.js
```

---

### Renamed/Moved Files Not Tracked

```bash
# Default git blame doesn't follow renames well
$ git-why src/new-location.js:50
# May not show full history

# Force follow renames:
$ git log --follow src/new-location.js

# Or git-why with explicit follow (if supported):
$ git-why --follow src/new-location.js:50
```

**Workaround for complex renames:**
```bash
# Find original filename
$ git log --follow --diff-filter=R --find-renames src/new-location.js

# Explain old file
$ git-why old-location.js:50
```

---

### Large Repository Performance

```bash
# For very large repos (>10k commits), git-why may be slow
$ time git-why src/app.js:42
# 45 seconds

# Limit commit history depth:
$ git-why --max-commits 50 src/app.js:42  # Faster, less context

# Or analyze only recent history:
$ git-why --since="2025-01-01" src/app.js:42
```

---

### Shallow Clones Missing History

```bash
$ git-why src/app.js
Error: Insufficient history (shallow clone)

# Shallow clones (git clone --depth 1) lack history
# Solution: Fetch full history
$ git fetch --unshallow

# Then retry:
$ git-why src/app.js
```

---

### API Key Issues

```bash
$ git-why src/app.js
Error: ANTHROPIC_API_KEY not set

# Solution:
$ export ANTHROPIC_API_KEY="sk-ant-..."

# Or use different provider (if supported):
$ export OPENAI_API_KEY="sk-..."
$ git-why --provider openai src/app.js
```

---

## License

MIT

## Credits

Built with:
- [Anthropic Claude](https://anthropic.com) - The AI explaining your code history
- [Git](https://git-scm.com/) - The actual source of truth
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal colors

---

Made by [muin](https://github.com/muin-company)

*Use responsibly. Git history doesn't lie, but it doesn't always tell the full story either.*

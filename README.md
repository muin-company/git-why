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

### Explain a whole file
```bash
git-why src/auth.js
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

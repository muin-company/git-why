# git-why

**Git blame tells you who. git-why tells you _WHY_.**

[![npm version](https://img.shields.io/npm/v/git-why.svg)](https://www.npmjs.com/package/git-why)
[![npm downloads](https://img.shields.io/npm/dm/git-why.svg)](https://www.npmjs.com/package/git-why)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/git-why.svg)](https://nodejs.org)

## The Problem

You open a file. Line 87 has a bizarre regex. The variable name makes no sense. There's a try-catch wrapping a single assignment.

You run `git blame`. Now you know *who* wrote it and *when*. Congratulations — you still have no idea **why**.

You could dig through commit messages, PRs, and Slack history. Or you could:

```bash
git-why src/validators.js:87
```

## What It Does

`git-why` analyzes git blame, commit messages, and diffs — then uses AI to explain the reasoning behind the code. It turns raw git history into a human-readable narrative.

```
📖 Git History Explanation
────────────────────────────────────────────────

This unusual email regex was added after discovering that
RFC 5322 validation rejected corporate emails with + signs
(e.g., "user+tag@company.com").

The commented-out "strict mode" was an attempted fix that
broke too many legitimate addresses in production — kept as
documentation of what NOT to do.

────────────────────────────────────────────────
```

Think of it as having a senior developer explain the archaeological layers of your codebase — except they actually read all the commit messages.

## Installation

```bash
npm install -g git-why
```

Or run without installing:

```bash
npx git-why src/auth.js:42
```

## Setup

You need an Anthropic API key. Get one at [console.anthropic.com](https://console.anthropic.com/settings/keys).

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Add to `~/.bashrc` or `~/.zshrc` to make it permanent.

## Quick Start

```bash
# Explain a specific line
git-why src/auth.js:42

# Explain a range
git-why src/auth.js:42-58

# Explain a function
git-why --function validateUser src/auth.js

# Explain an entire file
git-why src/auth.js

# Multiple files at once
git-why src/auth.js src/utils.js src/api.js
```

## Examples

### 1. Understanding mysterious code

You find a 200-line payment handler full of null checks and retry logic. Before you "clean it up":

```bash
$ git-why --function handlePayment src/payment.js
```
```
📖 Git History Explanation
────────────────────────────────────────────────

This payment handler accumulated defensive checks over time
due to several production incidents:

1. The null check for `amount` — added after undefined amounts
   caused Stripe to charge $0.00, creating accounting chaos.

2. The retry logic — payment webhooks occasionally fail due to
   network timeouts. Immediate retries succeed 90% of the time.
   Without this, users saw "payment failed" despite successful charges.

3. The database transaction wrapper — added after a race condition
   where duplicate form submissions created multiple charges.

Each "ugly" part solved a real production problem.

────────────────────────────────────────────────
```

Now you know the landmines *before* you refactor.

### 2. Code review context

Reviewing a PR with suspicious-looking changes:

```bash
$ git-why src/api/rate-limiter.js:42
```
```
📖 Git History Explanation
────────────────────────────────────────────────

This Redis-based rate limiter replaced an in-memory solution
after the app scaled to multiple servers.

The 60-second window / 100 request limit was chosen based on
actual API usage patterns — 99% of legitimate users make fewer
than 50 requests/minute, but bots exceed 200/minute.

The sliding window algorithm (vs fixed window) prevents the
"reset boundary exploit" where users could make 200 requests
in 2 seconds by timing requests around the minute boundary.

────────────────────────────────────────────────
```

### 3. Onboarding to a legacy codebase

New to the team. Everything looks like spaghetti:

```bash
$ git-why src/legacy/parser.js
```
```
📖 Git History Explanation
────────────────────────────────────────────────

This parser handles data from an old third-party API
(deprecated 2024). It remains because:

1. 200+ customers still use the legacy integration
2. Migration is phased over 2 years
3. New code should use src/parsers/v2/ instead

The unusual regex patterns handle malformed XML from the old
vendor (who never fixed their output despite bug reports).

DO NOT refactor — this code is intentionally defensive and
will be removed entirely in Q4 2026.

────────────────────────────────────────────────
18 commits across 3 years, 4 contributors
```

### 4. Verbose mode — full commit details

```bash
$ git-why --verbose src/cache.js:67
```
```
📖 Git History Explanation
────────────────────────────────────────────────

This cache invalidation is intentionally aggressive after
a production bug where stale data persisted for hours.

────────────────────────────────────────────────
Commits analyzed:

f3a7b2c1 - 2026-01-20 14:45
  Alice Wong — Fix cache invalidation for nested relationships

  Original implementation only cleared exact keys:
  - cache.del(`user:${id}`)

  But didn't clear related keys like user:{id}:posts,
  user:{id}:settings — leading to stale data bugs.

d4e9c8b7 - 2025-11-12 09:23
  Bob Smith — Add Redis caching layer

────────────────────────────────────────────────
```

### 5. JSON output for automation

```bash
$ git-why --json src/config.js:15 | jq -r '.explanation'
```

Pipe to scripts, CI pipelines, or documentation generators:

```bash
# Generate history docs for core files
for file in src/core/*.js; do
  git-why "$file" --json | jq -r '.explanation' >> docs/architecture-decisions.md
done
```

## How It Works

1. **Git Blame** — finds which commits touched the target code
2. **Git Log** — pulls commit messages and diffs
3. **Context Analysis** — gathers surrounding code for context
4. **AI Explanation** — Claude analyzes everything and explains the "why"

## Options

```
Arguments:
  target                  file:line, file:start-end, or file

Options:
  -f, --function <name>   Explain a specific function
  -v, --verbose           Show detailed commit history
  --json                  Output as JSON
  --no-color              Disable colors
  -V, --version           Output version
  -h, --help              Display help
```

## vs Alternatives

| | git-why | git blame | git log |
|---|---|---|---|
| Shows **who** | ✅ | ✅ | ✅ |
| Shows **when** | ✅ | ✅ | ✅ |
| Shows **why** | ✅ | ❌ | Sometimes |
| Human-readable narrative | ✅ | ❌ | ❌ |
| Connects multiple commits | ✅ | ❌ | Manual |
| Function-level analysis | ✅ | ❌ | ❌ |
| Works offline | ❌ | ✅ | ✅ |
| Cost | ~$0.01/file | Free | Free |

**Use `git blame`** when you need quick authorship info.
**Use `git log`** when you need raw commit details.
**Use `git-why`** when you need to understand the reasoning and evolution behind code.

## Integration

### Git alias

```bash
git config --global alias.why '!f() { git-why "$@"; }; f'
```

Now: `git why src/auth.js:42`

### VS Code task

```json
{
  "label": "git-why: Explain Current Line",
  "type": "shell",
  "command": "git-why ${relativeFile}:${lineNumber}"
}
```

`Cmd+Shift+P` → "Run Task" → "git-why: Explain Current Line"

### Shell function

```bash
# Add to ~/.zshrc
gwhy() { git-why "$@"; }
```

## Requirements

- Node.js 18+
- Git repository with at least one commit
- Anthropic API key

## Limitations

- Requires internet (API call to Claude)
- Doesn't follow file renames (yet)
- Can't explain deleted code
- Binary files not supported
- AI explanations may occasionally misinterpret context

## Also From MUIN

Love `git-why`? Check out our other developer CLI tools:

- **[roast-cli](https://www.npmjs.com/package/roast-cli)** — AI code reviews with Gordon Ramsay energy. Brutally honest feedback from your terminal.
- **[portguard](https://www.npmjs.com/package/portguard)** — Monitor and kill zombie processes hogging your ports. Fix `EADDRINUSE` in one command.
- **[oops](https://www.npmjs.com/package/@mj-muin/oops-cli)** — Pipe any error to AI for instant fixes. Debug faster with AI-powered error analysis.

## Featured On

📰 Read the launch article on Dev.to: **[4 CLI Tools Every Developer Needs (That You've Never Heard Of)](https://dev.to/mjmuin/4-cli-tools-every-developer-needs-that-youve-never-heard-of-318b)**

## License

MIT

## Credits

Built with [Anthropic Claude](https://anthropic.com), [Commander.js](https://github.com/tj/commander.js), and [Chalk](https://github.com/chalk/chalk).

---

Made by [muin](https://github.com/muin-company) · *Good code tells you what. Great code tells you why.*

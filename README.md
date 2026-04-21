# git-why

**Git blame tells you who. git-why tells you _WHY_.**

> The AI-powered git history explainer and commit explainer that turns archaeological code digs into human-readable narratives. Think of it as a git-blame-ai that actually explains the reasoning, not just the authorship.

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

---

## Integration Examples

### VS Code Integration

Add git-why to your editor for instant explanations:

**Method 1: VS Code Task**

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Explain Current Line with git-why",
      "type": "shell",
      "command": "git-why ${relativeFile}:${lineNumber}",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Explain Current File",
      "type": "shell",
      "command": "git-why ${relativeFile}",
      "presentation": {
        "reveal": "always"
      }
    }
  ]
}
```

Usage: 
1. Place cursor on line you want explained
2. `Cmd+Shift+P` → "Run Task" → "Explain Current Line with git-why"

**Method 2: Custom Keybinding**

```json
// .vscode/keybindings.json
[
  {
    "key": "cmd+shift+g w",
    "command": "workbench.action.tasks.runTask",
    "args": "Explain Current Line with git-why"
  }
]
```

Now press `Cmd+Shift+G W` to explain any line!

---

### Git Alias for Quick Access

Add shortcuts to your git config:

```bash
# Add to ~/.gitconfig
git config --global alias.why '!f() { git-why "$@"; }; f'
git config --global alias.why-func '!f() { git-why --function "$@"; }; f'
git config --global alias.why-verbose '!f() { git-why --verbose "$@"; }; f'
```

Now use:
```bash
git why src/auth.js:42
git why-func validateUser src/auth.js
git why-verbose src/payment.js:105
```

---

### GitHub Actions - Auto-Comment on PR

Automatically add historical context to pull requests:

```yaml
# .github/workflows/pr-context.yml
name: Add Context to PRs

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  add-context:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Need full history for git-why
      
      - name: Install git-why
        run: npm install -g @muin/git-why
      
      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v39
      
      - name: Explain changed code
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "## 📖 Code History Context" >> context.md
          echo "" >> context.md
          
          for file in ${{ steps.changed-files.outputs.all_changed_files }}; do
            if [[ "$file" =~ \.(js|ts|py|go|rs)$ ]]; then
              echo "### $file" >> context.md
              git-why "$file" --no-color >> context.md 2>&1 || echo "No history available" >> context.md
              echo "" >> context.md
            fi
          done
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const context = fs.readFileSync('context.md', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: context
            });
```

---

### Pre-commit Hook - Context Before Changes

Warn developers before modifying critical code:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Critical files that need extra care
CRITICAL_FILES=(
  "src/auth/jwt.js"
  "src/payment/processor.js"
  "src/database/migrations.js"
)

STAGED_FILES=$(git diff --cached --name-only)

for file in "${CRITICAL_FILES[@]}"; do
  if echo "$STAGED_FILES" | grep -q "$file"; then
    echo "⚠️  You're modifying critical file: $file"
    echo ""
    echo "📖 Historical context:"
    git-why "$file" || true
    echo ""
    read -p "Continue with commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Commit cancelled."
      exit 1
    fi
  fi
done

exit 0
```

---

### Shell Function for Quick Lookups

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Explain current git blame
gwhy() {
  if [ -z "$1" ]; then
    echo "Usage: gwhy <file>[:line]"
    return 1
  fi
  
  git-why "$1"
}

# Explain function under cursor (requires fzf)
gwhy-func() {
  local file=$1
  
  if [ -z "$file" ]; then
    file=$(fzf --preview 'bat --color=always {}')
  fi
  
  # Extract functions using grep (basic)
  local funcs=$(grep -n "function\|const.*=.*=>" "$file" | fzf --preview "git-why $file:{1}")
  
  if [ -n "$funcs" ]; then
    local line=$(echo "$funcs" | cut -d: -f1)
    git-why "$file:$line"
  fi
}

# Explain last changed line in file
gwhy-last() {
  local file=$1
  local last_line=$(git log -1 --pretty=format:%H -- "$file" | xargs git show | grep -n "^+" | tail -1 | cut -d: -f1)
  
  git-why "$file:$last_line"
}
```

Usage:
```bash
gwhy src/auth.js:42
gwhy-func src/utils.js
gwhy-last src/config.js
```

---

### Slack/Discord Bot Integration

Create a bot command to explain code in chat:

```javascript
// slack-bot.js - Simple Slack bot with git-why integration

const { App } = require('@slack/bolt');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Command: /why <file>:<line>
app.command('/why', async ({ command, ack, respond }) => {
  await ack();
  
  const target = command.text;
  
  if (!target) {
    await respond('Usage: /why <file>:<line> or /why <file>');
    return;
  }
  
  await respond(`🔍 Analyzing ${target}...`);
  
  try {
    const { stdout } = await execPromise(`git-why ${target}`);
    
    await respond({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📖 Git History for ${target}*\n\n${stdout}`
          }
        }
      ]
    });
  } catch (error) {
    await respond(`❌ Error: ${error.message}`);
  }
});

app.start(process.env.PORT || 3000);
```

Usage in Slack:
```
/why src/auth.js:42
/why src/payment/processor.go
```

---

### npm Scripts for Common Tasks

Add to `package.json`:

```json
{
  "scripts": {
    "why": "git-why",
    "why:auth": "git-why src/auth/index.js",
    "why:api": "git-why src/api/routes.js",
    "why:db": "git-why src/database/schema.js",
    "explain:file": "git-why",
    "docs:history": "git-why src/ > docs/code-history.md"
  }
}
```

Usage:
```bash
npm run why src/utils.js:67
npm run why:auth
npm run docs:history
```

---

### CI/CD - Generate Code Documentation

Auto-generate historical context for documentation:

```yaml
# .github/workflows/docs.yml
name: Update Code Documentation

on:
  push:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Install git-why
        run: npm install -g @muin/git-why
      
      - name: Generate historical context
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          mkdir -p docs/history
          
          # Core files to document
          FILES=(
            "src/auth/jwt.js"
            "src/payment/processor.js"
            "src/api/rate-limiter.js"
          )
          
          echo "# Code History & Context" > docs/history/README.md
          echo "Auto-generated: $(date)" >> docs/history/README.md
          echo "" >> docs/history/README.md
          
          for file in "${FILES[@]}"; do
            echo "## $file" >> docs/history/README.md
            git-why "$file" --no-color >> docs/history/README.md
            echo "" >> docs/history/README.md
          done
      
      - name: Commit docs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/
          git diff --staged --quiet || git commit -m "docs: update code history"
          git push
```

---

### JetBrains IDE Integration (IntelliJ, WebStorm, PyCharm)

Add External Tool:

1. Go to **Settings** → **Tools** → **External Tools**
2. Click **+** to add new tool
3. Configure:
   - **Name**: `git-why`
   - **Program**: `git-why`
   - **Arguments**: `$FilePath$:$LineNumber$`
   - **Working directory**: `$ProjectFileDir$`

4. Add keyboard shortcut:
   - **Settings** → **Keymap** → Search "External Tools" → "git-why"
   - Right-click → **Add Keyboard Shortcut** → `Ctrl+Shift+G W`

Now right-click any line → **External Tools** → **git-why**

---

## Troubleshooting

### "Error: No git repository found"

**Problem:** Running git-why outside a git repository.

**Solution:**
```bash
# Verify you're in a git repo
git status

# If not initialized:
cd /path/to/your/project
git init
git add .
git commit -m "Initial commit"

# Then try again:
git-why src/file.js:42
```

---

### "Error: File not found in git history"

**Problem:** File exists but has no commits yet (unstaged or newly created).

**Solution:**
```bash
# Check git status
git status

# If file is untracked:
git add src/new-file.js
git commit -m "Add new-file.js"

# Now git-why will work:
git-why src/new-file.js:10
```

---

### "Error: ANTHROPIC_API_KEY not set"

**Problem:** API key not configured.

**Solution:**
```bash
# Get API key from https://console.anthropic.com/settings/keys

# Set for current session:
export ANTHROPIC_API_KEY="sk-ant-..."

# Set permanently (add to ~/.bashrc or ~/.zshrc):
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
source ~/.bashrc

# Or use .env file (if supported by your setup):
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Verify:
echo $ANTHROPIC_API_KEY
```

---

### "Error: API request failed"

**Problem:** Network issues, API quota exceeded, or invalid API key.

**Solution:**
```bash
# Check API key is valid:
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'

# If you get 401: Invalid API key
# If you get 429: Rate limit exceeded (wait a bit)
# If you get 200: API key works, check git-why version

# Update git-why:
npm update -g @muin/git-why

# Check version:
git-why --version
```

---

### Shallow clone issues (CI/CD)

**Problem:** In CI, repos are often cloned with `--depth=1`, so git history is incomplete.

**Solution:**
```yaml
# GitHub Actions - Fetch full history
- uses: actions/checkout@v3
  with:
    fetch-depth: 0  # Fetch all history

# GitLab CI
variables:
  GIT_DEPTH: 0

# Or manually:
git fetch --unshallow
```

---

### "Line number out of range"

**Problem:** Requested line number doesn't exist in file.

**Solution:**
```bash
# Check file length:
wc -l src/auth.js
# Output: 150 src/auth.js

# You asked for line 9999 but file has 150 lines
git-why src/auth.js:150  # Use valid line number

# Or omit line number to explain entire file:
git-why src/auth.js
```

---

### Slow performance on large files

**Problem:** git-why takes too long on files with extensive history.

**Solution:**
```bash
# Explain specific line instead of whole file:
git-why src/large-file.js:42  # Fast

# Instead of:
git-why src/large-file.js  # Slow (analyzes all history)

# Or use --json for programmatic parsing (faster):
git-why src/file.js --json | jq '.explanation'

# Limit git log depth (if tool supports):
# (Feature request - not yet implemented)
```

---

### Binary files or non-text files

**Problem:** git-why doesn't work on images, PDFs, etc.

**Solution:**
Only works with text files (.js, .ts, .py, .go, .rs, .java, .c, .cpp, etc.)

```bash
# This works:
git-why src/app.js

# This won't work:
git-why public/logo.png
# Error: Cannot analyze binary files

# Workaround: Explain the commit that added the binary
git log --follow public/logo.png
# Then manually read commit message
```

---

### Git renamed files not tracked properly

**Problem:** File was renamed, history before rename is not included.

**Workaround:**
```bash
# Check if file was renamed:
git log --follow --oneline src/auth.js

# Use git log --follow manually to see full history:
git log --follow --patch src/auth.js

# git-why doesn't follow renames yet (planned feature)
# For now, use git log --follow
```

---

### Output too verbose

**Problem:** Too much output, just want the summary.

**Solution:**
```bash
# Use --json and extract just the explanation:
git-why src/file.js --json | jq -r '.explanation'

# Or grep for key points:
git-why src/file.js | grep "💡\|🚨\|⚠️"

# Or redirect to file and review later:
git-why src/file.js > explanation.txt
```

---

### Permission denied (on macOS/Linux)

**Problem:** `git-why: command not found` or permission errors.

**Solution:**
```bash
# Check if installed:
which git-why

# If not found, install:
npm install -g @muin/git-why

# If installed but permission error:
sudo npm install -g @muin/git-why

# Or use npx (no install needed):
npx @muin/git-why src/file.js

# Check npm global bin path:
npm config get prefix
# Should be in PATH
echo $PATH | grep $(npm config get prefix)
```

---

### Rate limiting / Too many requests

**Problem:** Anthropic API rate limits hit during heavy usage.

**Solution:**
```bash
# Wait a bit between requests:
for file in src/*.js; do
  git-why "$file"
  sleep 5  # Wait 5 seconds between requests
done

# Or batch analyze and save to files:
mkdir -p git-why-output
for file in src/*.js; do
  git-why "$file" > "git-why-output/$(basename $file).md"
  sleep 2
done

# Use Haiku model (cheaper, faster, less rate-limited)
# (Feature request - model selection not yet implemented)
```

---

### Working with monorepos

**Problem:** Running git-why from monorepo root, but file is in subdirectory.

**Solution:**
```bash
# Use relative paths from monorepo root:
git-why packages/frontend/src/app.js:42
git-why services/api/src/auth.js

# Or cd into package:
cd packages/frontend
git-why src/app.js:42

# Works both ways!
```

---

## License

MIT

## Credits

Built with [Anthropic Claude](https://anthropic.com), [Commander.js](https://github.com/tj/commander.js), and [Chalk](https://github.com/chalk/chalk).

---

Made by [muin](https://github.com/muin-company) · *Good code tells you what. Great code tells you why.*

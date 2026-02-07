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

Built with:
- [Anthropic Claude](https://anthropic.com) - The AI explaining your code history
- [Git](https://git-scm.com/) - The actual source of truth
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal colors

---

## Common Use Cases

### 1. Before Refactoring Legacy Code
**Scenario:** You find confusing code and want to simplify it.

**Workflow:**
```bash
# Step 1: Understand why it exists
git-why src/legacy/payment-handler.js --function processPayment

# Output might reveal:
# "This defensive null checking exists because of a production incident where
#  undefined amounts caused $0 charges, creating accounting chaos..."

# Step 2: Check if the edge case is still relevant
git log --grep="payment.*bug" --since="1 year ago"

# Step 3: Decide whether to keep or refactor
# If incident was recent or edge case still applies → keep the "ugly" code
# If resolved or obsolete → safe to refactor
```

**Before git-why:**
- See weird code → refactor blindly → break production
- Or: Keep weird code → never improve codebase

**After git-why:**
- Understand context → make informed decision
- Refactor safely with edge cases in mind

---

### 2. Code Review - Understanding Intent
**Scenario:** Reviewing a PR with suspicious looking changes.

```bash
# PR adds strange validation logic
git-why src/validators/email.js:87

# Output:
# "This unusual regex was added after discovering standard RFC 5322
#  validation rejected valid corporate emails with + signs..."

# Now you understand it's not over-engineering, it's battle-tested
```

**Use in PR reviews:**
```bash
# For each changed file:
for file in $(git diff --name-only main..feature-branch); do
  echo "=== Context for $file ==="
  git-why "$file"
done > pr-context.md

# Share in PR description
```

---

### 3. Onboarding New Team Members
**Scenario:** New developer asks "why does this code exist?"

```bash
# Instead of explaining verbally, generate documentation:
git-why src/core/*.js > docs/architecture-decisions.md

# Or specific modules:
git-why src/auth/jwt.js > docs/auth-explained.md
git-why src/cache/invalidation.js > docs/cache-explained.md
```

**Team onboarding checklist:**
```markdown
# New Developer Setup

1. Clone repo
2. Read architecture docs:
   - `git-why src/core/app.js > explained/core-architecture.md`
   - `git-why src/api/routes.js > explained/api-design.md`
3. Review historical decisions before making changes
```

---

### 4. Debugging "Why Did This Change?"
**Scenario:** Feature worked last month, now it's broken.

```bash
# Find what changed
git blame src/broken-feature.js

# Understand why it changed
git-why src/broken-feature.js:42-58

# Output:
# "This was changed to handle edge case X after incident Y..."
# "The original implementation worked for 90% of cases but failed when..."

# Now you know whether to revert or fix differently
```

---

### 5. Compliance & Audit Documentation
**Scenario:** Need to explain why security decisions were made.

```bash
# Generate audit trail
git-why src/security/*.js --verbose --json > security-audit.json

# Or human-readable:
git-why src/auth/permissions.js > docs/security/permission-model-rationale.md
```

**Compliance report generation:**
```bash
#!/bin/bash
# Generate quarterly security audit report

echo "# Security Code Audit - Q1 2026" > audit-report.md
echo "" >> audit-report.md

for file in src/security/*.js src/auth/*.js; do
  echo "## $(basename $file)" >> audit-report.md
  git-why "$file" --verbose >> audit-report.md
  echo "" >> audit-report.md
done
```

---

### 6. Understanding Performance Optimizations
**Scenario:** See complex caching logic and wonder if it's needed.

```bash
git-why src/cache/strategy.js --function invalidateCache

# Output:
# "This aggressive invalidation (clearing all related keys) was added after
#  a production bug where stale data caused users to see outdated info for hours.
#  Performance impact was measured at ~5ms per invalidation, acceptable given
#  the correctness improvement."

# Metrics mentioned in commit:
# - Before: 0ms, but data stale for hours
# - After: 5ms, data always fresh
```

**When NOT to optimize:**
- git-why shows the "slow" code prevents a real bug
- Performance cost is justified by correctness
- Removing it risks recreating historical issues

---

### 7. API Design Decisions
**Scenario:** API has unusual endpoint structure.

```bash
git-why src/api/routes/user.js:25

# Output:
# "The POST /users/:id/verify endpoint exists separately from PUT /users/:id
#  because third-party integration required a specific verification flow that
#  didn't fit RESTful conventions. See discussion: #PR-234"
```

**API documentation generation:**
```bash
# Generate "Why we designed it this way" docs
for route in src/api/routes/*.js; do
  git-why "$route" > docs/api/$(basename $route .js)-rationale.md
done
```

---

### 8. Dependency Update Investigation
**Scenario:** Considering updating a pinned dependency.

```bash
# Why is this dependency pinned to exact version?
git-why package.json | grep "react"

# Output:
# "React is pinned to 17.0.2 because 18.x breaks legacy class components
#  in the admin panel. Migration plan tracked in issue #456."

# Check if migration is done:
gh issue view 456

# If resolved → safe to upgrade
# If not → keep pinned version
```

---

### 9. Security Vulnerability Context
**Scenario:** Security scanner flags old code as vulnerable.

```bash
# Why does this old crypto code still exist?
git-why src/utils/encryption.js

# Output:
# "This implementation is intentionally legacy to maintain compatibility with
#  encrypted data from 2019-2022. New code uses crypto-v2.js. DO NOT MODIFY
#  without migration plan for 10TB of encrypted user data."

# Decision: Don't "fix" it blindly, plan proper migration
```

---

### 10. Technical Debt Triage
**Scenario:** Prioritizing which technical debt to tackle.

```bash
# Find old, complex code
git log --all --format="%H %s" --since="2 years ago" | \
  grep -i "workaround\|hack\|temp\|fixme" | \
  while read commit msg; do
    git-why --commit $commit
  done > technical-debt-report.md
```

**Prioritization criteria:**
- **High priority:** Workaround for bug that's been fixed upstream
- **Medium priority:** Hack for old browser that we no longer support
- **Low priority:** Complex logic that prevents real, ongoing issue

---

## Tips & Tricks

### Performance & Efficiency

**1. Cache explanations for frequently checked files:**
```bash
# Generate explanations once
mkdir -p .git-why-cache
git-why src/core/app.js > .git-why-cache/core-app.md

# Read from cache instead of regenerating
cat .git-why-cache/core-app.md
```

**2. Limit analysis to recent commits:**
```bash
# Only analyze last 6 months (faster)
git-why src/file.js --since="6 months ago"

# Feature request - not yet implemented
```

**3. Batch process multiple files:**
```bash
# Instead of calling git-why 50 times:
find src -name "*.js" | xargs -I {} git-why {} > bulk-explanations.md

# Or parallel processing:
find src -name "*.js" | parallel git-why {} > explanations/{/}.md
```

---

### Integration Patterns

**1. Git commit message enhancement:**
```bash
#!/bin/bash
# .git/hooks/prepare-commit-msg

# Auto-add context to commit messages
COMMIT_FILE=$1

git diff --cached --name-only | while read file; do
  echo "" >> $COMMIT_FILE
  echo "Context for $file:" >> $COMMIT_FILE
  git-why "$file" --compact >> $COMMIT_FILE
done
```

**2. Pull request templates:**
```markdown
<!-- .github/pull_request_template.md -->

## Changes
- Modified src/auth.js to add new feature

## Historical Context
<!-- Auto-generated by git-why -->
```

**GitHub Action to auto-fill context:**
```yaml
- name: Add historical context to PR
  run: |
    for file in $(git diff --name-only HEAD^); do
      git-why "$file" >> pr-context.md
    done
    gh pr comment $PR_NUMBER --body-file pr-context.md
```

**3. Documentation generation:**
```bash
# Generate "How we got here" docs for wiki
git-why src/core/*.js > wiki/architecture-evolution.md

# Update on every main branch push:
# .github/workflows/update-docs.yml
git-why src/ > docs/code-history.md
git add docs/
git commit -m "docs: update code history"
git push
```

---

### Advanced Git Commands

**1. Explain a specific commit:**
```bash
# Get SHA from git blame
git blame src/auth.js | grep "suspicious line"
# Output: a3b4c5d6 (Alice 2025-12-03 ...) suspicious code here

# Explain that commit
git show a3b4c5d6 | git-why
```

**2. Compare two versions:**
```bash
# Explain how a file evolved between branches
git diff main..feature-branch src/file.js | git-why

# Or specific commits:
git diff abc123..def456 src/file.js | git-why
```

**3. Find when a function was introduced:**
```bash
# Git pickaxe + git-why
git log -S"function validateUser" --all src/auth.js

# Then explain the commit:
git-why src/auth.js --function validateUser
```

---

### Shell Functions & Aliases

**Add to ~/.bashrc or ~/.zshrc:**
```bash
# Quick git-why alias
alias gwhy='git-why'

# Explain current line in vim/nano
gwhy-line() {
  local file=$1
  local line=$(echo "$2" | cut -d: -f1)
  git-why "$file:$line"
}
# Usage: gwhy-line src/auth.js 42

# Explain changed files in current branch
gwhy-branch() {
  local base=${1:-main}
  git diff --name-only $base..HEAD | while read file; do
    echo "=== $file ==="
    git-why "$file"
  done
}
# Usage: gwhy-branch main

# Explain staged changes before committing
gwhy-staged() {
  git diff --cached --name-only | while read file; do
    echo "=== $file ==="
    git-why "$file"
  done
}

# Fuzzy finder integration (requires fzf)
gwhy-fzf() {
  local file=$(git ls-files | fzf --preview 'git-why {} 2>/dev/null')
  [ -n "$file" ] && git-why "$file"
}
```

---

### IDE Integration Tips

**1. VS Code custom keybinding:**
```json
{
  "key": "ctrl+shift+w",
  "command": "workbench.action.terminal.sendSequence",
  "args": {
    "text": "git-why ${file}:${lineNumber}\n"
  }
}
```

**2. Vim integration:**
```vim
" Add to ~/.vimrc
nnoremap <leader>gw :!git-why %:p<CR>

" Explain current line
nnoremap <leader>gl :execute '!git-why ' . expand('%:p') . ':' . line('.')<CR>
```

**3. IntelliJ / WebStorm:**
```xml
<!-- Settings > Tools > External Tools -->
<tool name="git-why">
  <program>git-why</program>
  <arguments>$FilePath$:$LineNumber$</arguments>
  <workingDirectory>$ProjectFileDir$</workingDirectory>
</tool>
```

---

### JSON Output Processing

**Extract specific information:**
```bash
# Get only the explanation text
git-why src/file.js --json | jq -r '.explanation'

# List all commits analyzed
git-why src/file.js --json | jq -r '.commits[].sha'

# Get commit authors
git-why src/file.js --json | jq -r '.commits[].author' | sort -u

# Find commits from specific author
git-why src/file.js --json | jq '.commits[] | select(.author == "Alice Chen")'
```

**Generate reports:**
```bash
# Monthly contributor summary
git-why src/ --json | \
  jq -r '.commits[] | "\(.date[:7]) - \(.author)"' | \
  sort | uniq -c > monthly-contributors.txt

# Code age analysis
git-why src/ --json | \
  jq -r '.commits[] | .date' | \
  awk '{count[$1]++} END {for (date in count) print date, count[date]}'
```

---

### Team Workflow Integration

**1. Code review checklist:**
```markdown
## Code Review Checklist

- [ ] Code works as expected
- [ ] Tests pass
- [ ] **Historical context reviewed** (`git-why <changed-files>`)
- [ ] No regression of previous bug fixes
- [ ] Documentation updated
```

**2. Definition of Done:**
```markdown
A task is Done when:
- Feature implemented
- Tests written
- **Code history documented** (`git-why` run and committed to docs/)
- PR approved
```

**3. Knowledge transfer sessions:**
```bash
# Before a team member leaves:
git-why src/ --verbose > handoff-docs/code-context-$(date +%Y%m%d).md

# New team member reads this instead of asking "why?" repeatedly
```

---

## FAQ

### Q: Does git-why work on new files with no history?
**A:** No, git-why requires at least one commit. For new files:

```bash
$ git-why src/new-file.js
Error: No git history found for this file

# Solution:
git add src/new-file.js
git commit -m "Add new file"
git-why src/new-file.js  # Now works
```

---

### Q: Can git-why follow file renames?
**A:** Not yet. If you rename a file, git-why only shows history after the rename.

**Workaround:**
```bash
# Use git log --follow
git log --follow --oneline src/renamed-file.js

# Then manually check old filename:
git-why old-filename.js
```

**Feature request:** Add `--follow` option to track renames.

---

### Q: How far back does git-why look?
**A:** By default, all commits. For large repos, this can be slow.

**Performance tips:**
```bash
# Analyze only recent history (faster)
git log --since="1 year ago" src/file.js | git-why

# Or limit number of commits
git log -n 10 src/file.js | git-why
```

**Future feature:** `--since`, `--until`, `--max-commits` options.

---

### Q: Can I exclude certain authors or commits?
**A:** Not yet, but you can filter git log first:

```bash
# Exclude bot commits
git log --all --author='!.*bot$' src/file.js | git-why

# Only show commits from specific author
git log --author="Alice" src/file.js | git-why
```

---

### Q: Does git-why work with monorepos?
**A:** Yes, but specify full paths:

```bash
# From monorepo root:
git-why packages/frontend/src/app.js
git-why services/api/src/server.js

# Or cd into package:
cd packages/frontend
git-why src/app.js
```

---

### Q: What if my git history is messy (squashed commits, rebases)?
**A:** git-why analyzes whatever history exists. If commits are squashed:
- You'll see fewer, larger commits
- Explanations will be less granular
- Still better than no context!

**Tip:** Avoid squashing commits that explain important decisions.

---

### Q: Can git-why analyze commits from deleted files?
**A:** No. If a file is deleted, git-why can't analyze it directly.

**Workaround:**
```bash
# Find when file was deleted
git log --all --full-history -- src/deleted-file.js

# Checkout old version
git show abc123:src/deleted-file.js > /tmp/deleted-file.js

# Analyze old version
git-why /tmp/deleted-file.js  # Won't work, no git history

# Better: Read commit message directly
git show abc123
```

---

### Q: How much does git-why cost (API usage)?
**A:** Depends on file size and commit history. Typical cost per file:
- Small file (~100 lines, 5 commits): ~$0.01
- Medium file (~500 lines, 20 commits): ~$0.05
- Large file (~2000 lines, 100 commits): ~$0.20

**Reduce costs:**
```bash
# Analyze only specific lines
git-why src/large-file.js:42-58  # Cheaper than whole file

# Use caching (see Tips & Tricks)
git-why src/file.js > cache/file-explained.md  # Reuse this
```

---

### Q: Can I use git-why without an API key?
**A:** No, git-why requires Anthropic Claude API. Future versions may support:
- Local LLMs (Ollama, LM Studio)
- OpenAI API
- Self-hosted models

**Current workaround:**
- Get free trial API key from [Anthropic](https://console.anthropic.com)
- Use git log/git blame manually (no AI explanation)

---

### Q: Does git-why respect .gitignore?
**A:** Yes, git-why only analyzes files tracked by git. Ignored files are skipped.

---

### Q: What if commit messages are unhelpful ("fix", "update", "wip")?
**A:** git-why still analyzes diffs, but explanations will be less informative.

**Improve commit messages:**
```bash
# Use conventional commits
git commit -m "fix(auth): prevent race condition in JWT validation"
git commit -m "feat(api): add rate limiting to prevent abuse"

# Not:
git commit -m "fix"
git commit -m "update"
```

**git-why tip:** Even with bad messages, diff analysis often reveals intent.

---

### Q: Can I customize the explanation style?
**A:** Not yet. Current output is AI-generated prose.

**Feature request:** Support for:
- Different tone (technical, beginner-friendly, concise)
- Output format (bullet points, paragraphs, markdown)
- Language (Spanish, French, etc.)

**Workaround:**
```bash
# Post-process output
git-why src/file.js | \
  sed 's/This/• This/g' |  # Convert to bullet points
  grep -v "^$"              # Remove blank lines
```

---

### Q: How do I report incorrect explanations?
**A:** git-why uses AI, so it can misinterpret. To report issues:

1. Check git log to verify actual history
2. If explanation is wrong, open issue on GitHub with:
   - File path
   - Expected vs actual explanation
   - Git history excerpt

**Improve accuracy:**
- Provide more context in commits
- Use verbose mode: `git-why --verbose`
- Include related commits

---

### Q: Can git-why analyze pull requests?
**A:** Indirectly. Analyze files changed in PR:

```bash
# Get changed files
gh pr view 123 --json files -q '.files[].path' | \
  xargs -I {} git-why {}

# Or with git:
git diff main..feature-branch --name-only | \
  xargs -I {} git-why {}
```

**Future feature:** `git-why --pr 123` (analyze entire PR).

---

### Q: Does git-why work offline?
**A:** No, requires internet to call Claude API.

**Offline alternatives:**
```bash
# Manual git log analysis
git log --oneline --graph src/file.js

# Git blame
git blame -L 42,58 src/file.js

# Pickaxe search
git log -S "function name" --all
```

---

### Q: Can I integrate git-why into CI/CD?
**A:** Yes, but be mindful of costs. Example use cases:

**Good:**
```yaml
# Document code on every main branch push
- name: Update code history docs
  run: git-why src/ > docs/code-history.md
```

**Expensive:**
```yaml
# DON'T run on every commit (costly!)
- name: Explain all files
  run: find . -name "*.js" | xargs git-why  # $$$
```

**Better:** Run weekly, or only on docs changes.

---

### Q: What's the difference between git-why and git log?
**A:**

| Feature | git log | git-why |
|---------|---------|---------|
| Output | Raw commits | AI-generated narrative |
| Context | Technical | Business/human-readable |
| Speed | Instant | 1-3 seconds (API call) |
| Cost | Free | ~$0.01-0.20 per file |
| Offline | ✅ Yes | ❌ No |
| Understanding | Requires git expertise | Plain English |

**Use git log when:**
- You need exact commit details
- Offline work
- Quick reference

**Use git-why when:**
- Understanding "why" decisions were made
- Onboarding new developers
- Code review context

---

### Q: Can I run git-why on GitHub repositories I don't have locally?
**A:** Not directly. You need to clone first:

```bash
# Clone repo
git clone https://github.com/user/repo
cd repo

# Then analyze
git-why src/file.js
```

**Future feature:** `git-why --repo github.com/user/repo --file src/file.js`

---

### Q: Does git-why support Bitbucket, GitLab, Azure DevOps?
**A:** Yes, git-why works with any git repository. It doesn't care about hosting provider:

```bash
# GitLab
git clone git@gitlab.com:user/repo.git
cd repo
git-why src/file.js

# Bitbucket
git clone https://bitbucket.org/user/repo.git
cd repo
git-why src/file.js

# Azure DevOps
git clone https://dev.azure.com/org/project/_git/repo
cd repo
git-why src/file.js
```

All work the same—git-why only reads local git history.

---

### Q: Can I contribute improvements or language support?
**A:** Yes! See [Contributing](#contributing) section. Helpful contributions:
- Better error detection
- Support for more languages (currently best with English)
- Performance optimizations for large repos
- Integration examples (new IDEs, tools)
- Bug reports with reproducible examples

---

Made by [muin](https://github.com/muin-company)

*Use responsibly. Git history doesn't lie, but it doesn't always tell the full story either.*

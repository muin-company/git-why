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

**Simple line explanation:**
```bash
$ git-why src/components/Button.tsx:23

📖 Git History Explanation
────────────────────────────────────────────────────────────

This disabled state check was added to fix a race condition where
double-clicks could submit forms twice. The original implementation
only prevented the click event, but users could still trigger the
action by rapidly clicking. The solution adds both disabled state
and a loading flag to completely lock the button during async operations.

The approach changed over time - initially it was just a simple
disabled prop, then evolved to include visual feedback (the loading
spinner) based on user feedback about the button appearing "stuck".

────────────────────────────────────────────────────────────
Explained by git-why
```

**With verbose flag:**
```bash
$ git-why --verbose src/auth.js:15

📖 Git History Explanation
────────────────────────────────────────────────────────────

This JWT expiration check was added after a production incident where
expired tokens weren't being caught before API calls, leading to
confusing error messages for users. The 5-minute buffer exists because
some devices have clock drift...

────────────────────────────────────────────────────────────
Commits analyzed:

a3b4c5d6 - 2026-01-15
  Sarah Chen
  Add 5min buffer for token expiration checks

b7c8d9e0 - 2025-12-03
  Mike Johnson
  Initial JWT implementation

────────────────────────────────────────────────────────────
Explained by git-why
```

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

# git-why Demo

## Installation

```bash
cd ~/muin/projects/git-why
npm link
```

## Basic Usage

### Help
```bash
$ git-why --help

Usage: git-why [options] [target]

AI-powered git history explainer

Arguments:
  target                 file:line, file, or file to analyze

Options:
  -V, --version          output the version number
  -f, --function <name>  explain a specific function
  -v, --verbose          show detailed commit history
  --json                 output as JSON
  --no-color             disable colors
  -h, --help             display help for command
```

### Version
```bash
$ git-why --version
0.1.0
```

### Explain a Line
```bash
$ git-why README.md:1

📖 Git History Explanation
────────────────────────────────────────────────────────────

This header establishes the project identity simply and clearly. 
The single-word name "git-why" reflects the tool's purpose - 
answering "why" questions about code through git history analysis...

────────────────────────────────────────────────────────────
Explained by git-why
```

### Explain with Verbose
```bash
$ git-why --verbose lib/git-why.js:45

📖 Git History Explanation
────────────────────────────────────────────────────────────

[Explanation here]

────────────────────────────────────────────────────────────
Commits analyzed:

8072f2b - 2026-02-05
  mj
  Initial commit: git-why CLI tool

────────────────────────────────────────────────────────────
Explained by git-why
```

### Explain a Function
```bash
$ git-why --function isGitRepo lib/git-why.js

📖 Git History Explanation
────────────────────────────────────────────────────────────

[Explanation of why this function exists]

────────────────────────────────────────────────────────────
Explained by git-why
```

### JSON Output
```bash
$ git-why --json README.md:1 | jq

{
  "explanation": "...",
  "commits": [
    {
      "hash": "8072f2b...",
      "author": "mj",
      "date": "2026-02-05T...",
      "message": "Initial commit: git-why CLI tool..."
    }
  ]
}
```

## Error Handling

### No API Key
```bash
$ git-why README.md:1

Error: No API key found. Set either ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.
Get your key at: https://console.anthropic.com/settings/keys
```

### Not a Git Repo
```bash
$ cd /tmp && git-why test.js

Error: Not a git repository. Run git init first.
```

### File Not Tracked
```bash
$ touch untracked.js
$ git-why untracked.js:1

Error: File not tracked by git: untracked.js
```

### Invalid Line Number
```bash
$ git-why README.md:abc

Error: Invalid line number: abc
```

### Function Not Found
```bash
$ git-why --function nonExistent lib/git-why.js

Error: Function "nonExistent" not found in lib/git-why.js
```

## Real Example (with API key)

```bash
$ export ANTHROPIC_API_KEY="sk-ant-..."
$ git-why lib/git-why.js:23

📖 Git History Explanation
────────────────────────────────────────────────────────────

The `isGitRepo()` function was added as a validation step to provide
clear error messages when users try to run git-why outside of a git
repository. Rather than letting git commands fail with cryptic errors,
this check happens first and returns a user-friendly message.

This follows the pattern established in the roast and oops tools where
early validation improves the developer experience. The implementation
uses `git rev-parse --git-dir` because it's the standard way to check
for a git repository and works in all git contexts (repos, worktrees, etc).

────────────────────────────────────────────────────────────
Explained by git-why
```

## Testing It

```bash
# Run test suite
npm test

# Test on itself
git-why lib/git-why.js:1
git-why --verbose bin/git-why.js:15
git-why --function explain lib/git-why.js
```

## Notes

- Requires an active git repository
- File must be tracked by git (added/committed)
- Works best with files that have meaningful git history
- Explanations are better with descriptive commit messages

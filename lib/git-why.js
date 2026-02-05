import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export class GitWhy {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.json = options.json || false;
    this.noColor = options.noColor || false;
  }

  /**
   * Check if current directory is a git repository
   */
  isGitRepo() {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file is tracked by git
   */
  isFileTracked(filePath) {
    try {
      execSync(`git ls-files --error-unmatch "${filePath}"`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get git blame for a specific line or range
   */
  getBlame(filePath, lineNumber = null, endLine = null) {
    try {
      let cmd = `git blame -w --line-porcelain "${filePath}"`;
      if (lineNumber) {
        const range = endLine ? `${lineNumber},${endLine}` : lineNumber;
        cmd = `git blame -w --line-porcelain -L ${range} "${filePath}"`;
      }
      
      const output = execSync(cmd, { encoding: 'utf-8' });
      return this.parseBlameOutput(output);
    } catch (error) {
      throw new Error(`Failed to get git blame: ${error.message}`);
    }
  }

  /**
   * Parse git blame porcelain output
   */
  parseBlameOutput(output) {
    const commits = [];
    const lines = output.split('\n');
    let currentCommit = {};

    for (const line of lines) {
      if (line.match(/^[0-9a-f]{40}/)) {
        if (currentCommit.hash) {
          commits.push({ ...currentCommit });
        }
        currentCommit = { hash: line.split(' ')[0] };
      } else if (line.startsWith('author ')) {
        currentCommit.author = line.substring(7);
      } else if (line.startsWith('author-time ')) {
        currentCommit.timestamp = parseInt(line.substring(12));
      } else if (line.startsWith('summary ')) {
        currentCommit.summary = line.substring(8);
      }
    }

    if (currentCommit.hash) {
      commits.push(currentCommit);
    }

    // Deduplicate by hash
    const unique = [];
    const seen = new Set();
    for (const commit of commits) {
      if (!seen.has(commit.hash)) {
        seen.add(commit.hash);
        unique.push(commit);
      }
    }

    return unique;
  }

  /**
   * Get full commit details
   */
  getCommitDetails(hash) {
    try {
      const message = execSync(`git log -1 --format=%B ${hash}`, { encoding: 'utf-8' }).trim();
      const diff = execSync(`git show ${hash}`, { encoding: 'utf-8' });
      const files = execSync(`git show --name-status ${hash}`, { encoding: 'utf-8' });
      
      return { message, diff, files };
    } catch (error) {
      throw new Error(`Failed to get commit details: ${error.message}`);
    }
  }

  /**
   * Get code context around a line
   */
  getCodeContext(filePath, lineNumber, contextLines = 5) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);
    
    return {
      code: lines.slice(start, end).join('\n'),
      startLine: start + 1,
      targetLine: lineNumber
    };
  }

  /**
   * Find function at line number
   */
  findFunctionAtLine(filePath, lineNumber) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Simple heuristic: look backwards for function declaration
    const functionPatterns = [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      /(\w+)\s*\([^)]*\)\s*{/,
      /def\s+(\w+)\s*\(/,  // Python
      /func\s+(\w+)\s*\(/,  // Go
    ];
    
    for (let i = lineNumber - 1; i >= 0; i--) {
      for (const pattern of functionPatterns) {
        const match = lines[i].match(pattern);
        if (match) {
          return { name: match[1], line: i + 1 };
        }
      }
      // Don't look too far
      if (lineNumber - i > 50) break;
    }
    
    return null;
  }

  /**
   * Search for function definition in file
   */
  findFunction(filePath, functionName) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const patterns = [
      new RegExp(`function\\s+${functionName}\\s*\\(`),
      new RegExp(`const\\s+${functionName}\\s*=`),
      new RegExp(`def\\s+${functionName}\\s*\\(`),
      new RegExp(`func\\s+${functionName}\\s*\\(`),
      new RegExp(`\\b${functionName}\\s*:\\s*function`),
    ];
    
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[i])) {
          return i + 1;
        }
      }
    }
    
    throw new Error(`Function "${functionName}" not found in ${filePath}`);
  }

  /**
   * Explain using AI
   */
  async explain(filePath, options = {}) {
    const { lineNumber, functionName, endLine } = options;
    
    // Validate file
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (!this.isGitRepo()) {
      throw new Error('Not a git repository. Run git init first.');
    }

    if (!this.isFileTracked(filePath)) {
      throw new Error(`File not tracked by git: ${filePath}`);
    }

    // Determine what to analyze
    let targetLine = lineNumber;
    let targetEndLine = endLine;
    
    if (functionName) {
      targetLine = this.findFunction(filePath, functionName);
      // Try to find end of function (simple heuristic)
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let braceCount = 0;
      let started = false;
      for (let i = targetLine - 1; i < lines.length; i++) {
        for (const char of lines[i]) {
          if (char === '{') {
            braceCount++;
            started = true;
          } else if (char === '}') {
            braceCount--;
            if (started && braceCount === 0) {
              targetEndLine = i + 1;
              break;
            }
          }
        }
        if (targetEndLine) break;
      }
    }

    // Get git history
    const commits = this.getBlame(filePath, targetLine, targetEndLine);
    
    if (commits.length === 0) {
      throw new Error('No git history found for this code');
    }

    // Get detailed commit info (limit to most relevant)
    const relevantCommits = commits.slice(0, 5);
    const commitDetails = relevantCommits.map(c => {
      const details = this.getCommitDetails(c.hash);
      return {
        ...c,
        ...details
      };
    });

    // Get code context
    const context = this.getCodeContext(filePath, targetLine || 1);
    
    // Build context for AI
    const analysisContext = {
      file: filePath,
      lineNumber: targetLine,
      functionName,
      code: context.code,
      commits: commitDetails
    };

    // Call AI
    const explanation = await this.callAI(analysisContext);

    return {
      context: analysisContext,
      explanation,
      commits: commitDetails
    };
  }

  /**
   * Call AI to explain the code history
   */
  async callAI(context) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'No API key found. Set either ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.\n' +
        'Get your key at: https://console.anthropic.com/settings/keys'
      );
    }

    // For now, we'll use Anthropic. OpenAI support can be added later
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Currently only ANTHROPIC_API_KEY is supported. OpenAI support coming soon.');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = this.buildPrompt(context);

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;
    } catch (error) {
      throw new Error(`AI API call failed: ${error.message}`);
    }
  }

  /**
   * Build prompt for AI
   */
  buildPrompt(context) {
    const { file, lineNumber, functionName, code, commits } = context;

    const commitInfo = commits.map((c, i) => {
      return `
## Commit ${i + 1}: ${c.hash.substring(0, 8)}
Author: ${c.author}
Date: ${new Date(c.timestamp * 1000).toISOString().split('T')[0]}
Message: ${c.message}

Relevant changes:
\`\`\`
${c.diff.split('\n').slice(0, 100).join('\n')}
\`\`\`
`;
    }).join('\n');

    const target = functionName 
      ? `function "${functionName}"`
      : lineNumber 
        ? `line ${lineNumber}`
        : 'this code';

    return `You are a code archaeologist analyzing git history to explain why code exists.

File: ${file}
Target: ${target}

Current code:
\`\`\`
${code}
\`\`\`

Git history (most recent first):
${commitInfo}

Task: Explain WHY this code exists. Focus on:
1. What problem was it solving?
2. Why was this approach chosen?
3. What changed over time?
4. Any important context from commits?

Be concise but insightful. Write like a developer explaining to another developer, not a formal report.
Format: 2-3 paragraphs, no bullet points unless listing multiple reasons.`;
  }

  /**
   * Format output for display
   */
  formatOutput(result, options = {}) {
    if (this.json) {
      return JSON.stringify({
        explanation: result.explanation,
        commits: result.commits.map(c => ({
          hash: c.hash,
          author: c.author,
          date: new Date(c.timestamp * 1000).toISOString(),
          message: c.message
        }))
      }, null, 2);
    }

    const c = this.noColor ? (x) => x : chalk;
    const lines = [];

    lines.push('');
    lines.push(c.blue.bold('📖 Git History Explanation'));
    lines.push(c.gray('─'.repeat(60)));
    lines.push('');
    lines.push(result.explanation);
    lines.push('');

    if (this.verbose) {
      lines.push(c.gray('─'.repeat(60)));
      lines.push(c.yellow.bold('Commits analyzed:'));
      lines.push('');
      
      for (const commit of result.commits) {
        const date = new Date(commit.timestamp * 1000).toISOString().split('T')[0];
        lines.push(c.cyan(`${commit.hash.substring(0, 8)}`) + c.gray(` - ${date}`));
        lines.push(c.white(`  ${commit.author}`));
        lines.push(c.gray(`  ${commit.summary || commit.message.split('\n')[0]}`));
        lines.push('');
      }
    }

    lines.push(c.gray('─'.repeat(60)));
    lines.push(c.gray.italic('Explained by git-why'));
    lines.push('');

    return lines.join('\n');
  }
}

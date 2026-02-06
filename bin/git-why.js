#!/usr/bin/env node

import { program } from 'commander';
import { GitWhy } from '../lib/git-why.js';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

program
  .name('git-why')
  .description('AI-powered git history explainer')
  .version(packageJson.version)
  .argument('[targets...]', 'file:line, file:start-end, or file (multiple files supported)')
  .option('-f, --function <name>', 'explain a specific function')
  .option('-v, --verbose', 'show detailed commit history')
  .option('--json', 'output as JSON')
  .option('--no-color', 'disable colors')
  .action(async (targets, options) => {
    try {
      if (!targets || targets.length === 0) {
        console.error(chalk.red('Error: No target specified'));
        console.error(chalk.gray('Usage: git-why <file>:<line>'));
        console.error(chalk.gray('       git-why <file>:<start>-<end>   (line range)'));
        console.error(chalk.gray('       git-why <file>'));
        console.error(chalk.gray('       git-why <file1> <file2> ...   (multiple files)'));
        console.error(chalk.gray('       git-why --function <name> <file>'));
        process.exit(1);
      }

      const gitWhy = new GitWhy({
        verbose: options.verbose,
        json: options.json,
        noColor: !options.color
      });

      // Parse all targets
      const parsedTargets = targets.map(target => {
        let filePath, lineNumber, endLine;
        
        if (target.includes(':')) {
          const parts = target.split(':');
          filePath = parts[0];
          
          // Check for range (e.g., 42-58)
          if (parts[1].includes('-')) {
            const range = parts[1].split('-');
            lineNumber = parseInt(range[0]);
            endLine = parseInt(range[1]);
            
            if (isNaN(lineNumber) || isNaN(endLine)) {
              throw new Error(`Invalid line range: ${parts[1]}`);
            }
            if (lineNumber >= endLine) {
              throw new Error(`Invalid range: start line must be less than end line`);
            }
          } else {
            lineNumber = parseInt(parts[1]);
            if (isNaN(lineNumber)) {
              throw new Error(`Invalid line number: ${parts[1]}`);
            }
          }
        } else {
          filePath = target;
        }

        return { filePath, lineNumber, endLine };
      });

      // Validate function option usage
      if (options.function && parsedTargets.length > 1) {
        throw new Error('--function option cannot be used with multiple files');
      }

      const results = [];
      
      for (const [index, { filePath, lineNumber, endLine }] of parsedTargets.entries()) {
        // Show spinner (unless JSON mode)
        let spinner;
        if (!options.json) {
          const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
          let i = 0;
          const targetDesc = lineNumber 
            ? (endLine ? `${filePath}:${lineNumber}-${endLine}` : `${filePath}:${lineNumber}`)
            : filePath;
          spinner = setInterval(() => {
            process.stdout.write(`\r${chalk.cyan(frames[i++ % frames.length])} Analyzing ${targetDesc}...`);
          }, 80);
        }

        try {
          // Analyze
          const result = await gitWhy.explain(filePath, {
            lineNumber,
            endLine,
            functionName: options.function
          });

          // Clear spinner
          if (spinner) {
            clearInterval(spinner);
            process.stdout.write('\r' + ' '.repeat(60) + '\r');
          }

          results.push({ filePath, lineNumber, endLine, result });
        } catch (error) {
          if (spinner) {
            clearInterval(spinner);
            process.stdout.write('\r' + ' '.repeat(60) + '\r');
          }
          
          // For multiple files, show error but continue
          if (parsedTargets.length > 1) {
            console.error(chalk.red(`Error in ${filePath}:`), error.message);
            console.log('');
          } else {
            throw error;
          }
        }
      }

      if (results.length === 0) {
        console.error(chalk.red('No results to display'));
        process.exit(1);
      }

      // Display results
      if (options.json) {
        const output = results.map(r => ({
          file: r.filePath,
          lineNumber: r.lineNumber,
          endLine: r.endLine,
          explanation: r.result.explanation,
          commits: r.result.commits.map(c => ({
            hash: c.hash,
            author: c.author,
            date: new Date(c.timestamp * 1000).toISOString(),
            message: c.message
          }))
        }));
        console.log(JSON.stringify(output, null, 2));
      } else {
        for (const [index, { filePath, lineNumber, endLine, result }] of results.entries()) {
          if (results.length > 1) {
            const c = options.color === false ? (x) => x : chalk;
            const targetDesc = lineNumber 
              ? (endLine ? `${lineNumber}-${endLine}` : `line ${lineNumber}`)
              : 'entire file';
            console.log(c.magenta.bold(`\n━━━ ${filePath} (${targetDesc}) ━━━\n`));
          }
          const output = gitWhy.formatOutput(result, options);
          console.log(output);
        }
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();

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
  .argument('[target]', 'file:line, file, or file to analyze')
  .option('-f, --function <name>', 'explain a specific function')
  .option('-v, --verbose', 'show detailed commit history')
  .option('--json', 'output as JSON')
  .option('--no-color', 'disable colors')
  .action(async (target, options) => {
    try {
      // Parse target
      let filePath, lineNumber;
      
      if (!target) {
        console.error(chalk.red('Error: No target specified'));
        console.error(chalk.gray('Usage: git-why <file>:<line>'));
        console.error(chalk.gray('       git-why <file>'));
        console.error(chalk.gray('       git-why --function <name> <file>'));
        process.exit(1);
      }

      if (target.includes(':')) {
        const parts = target.split(':');
        filePath = parts[0];
        lineNumber = parseInt(parts[1]);
        
        if (isNaN(lineNumber)) {
          throw new Error(`Invalid line number: ${parts[1]}`);
        }
      } else {
        filePath = target;
      }

      // Validate function option usage
      if (options.function && !filePath) {
        throw new Error('--function requires a file path');
      }

      const gitWhy = new GitWhy({
        verbose: options.verbose,
        json: options.json,
        noColor: !options.color
      });

      // Show spinner (unless JSON mode)
      let spinner;
      if (!options.json) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        spinner = setInterval(() => {
          process.stdout.write(`\r${chalk.cyan(frames[i++ % frames.length])} Analyzing git history...`);
        }, 80);
      }

      // Analyze
      const result = await gitWhy.explain(filePath, {
        lineNumber,
        functionName: options.function
      });

      // Clear spinner
      if (spinner) {
        clearInterval(spinner);
        process.stdout.write('\r' + ' '.repeat(40) + '\r');
      }

      // Display result
      const output = gitWhy.formatOutput(result, options);
      console.log(output);

    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();

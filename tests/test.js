#!/usr/bin/env node

import { GitWhy } from '../lib/git-why.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const TEST_DIR = '/tmp/git-why-test-' + Date.now();

function setup() {
  console.log('Setting up test repository...');
  
  // Create test directory
  mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);
  
  // Initialize git repo
  execSync('git init');
  execSync('git config user.email "test@example.com"');
  execSync('git config user.name "Test User"');
  
  // Create a test file with history
  writeFileSync('test.js', `function hello() {
  return "world";
}
`);
  
  execSync('git add test.js');
  execSync('git commit -m "Initial implementation"');
  
  // Make a change
  writeFileSync('test.js', `function hello() {
  // Added safety check for null
  if (!global) return "";
  return "world";
}
`);
  
  execSync('git add test.js');
  execSync('git commit -m "Add null safety check\n\nPrevents crash when global is undefined in some environments."');
  
  console.log('Test repository created at:', TEST_DIR);
}

function cleanup() {
  console.log('Cleaning up...');
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    console.warn('Warning: Could not clean up test directory:', error.message);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log('✅', name);
    return true;
  } catch (error) {
    console.error('❌', name);
    console.error('  ', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Running git-why tests...\n');
  
  const gitWhy = new GitWhy({ noColor: true });
  let passed = 0;
  let failed = 0;

  // Test 1: Is git repo
  if (test('GitWhy.isGitRepo() detects git repository', () => {
    if (!gitWhy.isGitRepo()) {
      throw new Error('Should detect git repository');
    }
  })) passed++; else failed++;

  // Test 2: File tracked
  if (test('GitWhy.isFileTracked() detects tracked files', () => {
    if (!gitWhy.isFileTracked('test.js')) {
      throw new Error('Should detect tracked file');
    }
  })) passed++; else failed++;

  // Test 3: Get blame
  if (test('GitWhy.getBlame() returns commit history', () => {
    const commits = gitWhy.getBlame('test.js', 2);
    if (commits.length === 0) {
      throw new Error('Should return at least one commit');
    }
    if (!commits[0].hash) {
      throw new Error('Commit should have hash');
    }
  })) passed++; else failed++;

  // Test 4: Get commit details
  if (test('GitWhy.getCommitDetails() returns full commit info', () => {
    const commits = gitWhy.getBlame('test.js');
    const details = gitWhy.getCommitDetails(commits[0].hash);
    if (!details.message) {
      throw new Error('Should have commit message');
    }
  })) passed++; else failed++;

  // Test 5: Get code context
  if (test('GitWhy.getCodeContext() returns surrounding lines', () => {
    const context = gitWhy.getCodeContext('test.js', 2, 2);
    if (!context.code.includes('function hello')) {
      throw new Error('Should include function declaration');
    }
  })) passed++; else failed++;

  // Test 6: Find function
  if (test('GitWhy.findFunction() locates function definitions', () => {
    const line = gitWhy.findFunction('test.js', 'hello');
    if (line !== 1) {
      throw new Error(`Expected line 1, got ${line}`);
    }
  })) passed++; else failed++;

  // Test 7: Full explanation (without AI - just structure)
  if (test('GitWhy.explain() handles file without errors', async () => {
    // This will fail without API key, but should fail gracefully
    try {
      await gitWhy.explain('test.js', { lineNumber: 2 });
    } catch (error) {
      // Expected to fail without API key, but should be a clear error
      if (!error.message.includes('API key')) {
        throw new Error('Should fail with clear API key error');
      }
    }
  })) passed++; else failed++;

  console.log('\n─────────────────────────');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('─────────────────────────\n');

  return failed === 0;
}

// Run tests
setup();

try {
  const success = await runTests();
  cleanup();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('Test runner error:', error);
  cleanup();
  process.exit(1);
}

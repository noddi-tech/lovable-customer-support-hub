#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Check for risky TabsList spacing patterns that can cause overlap
 */

const RISKY_PATTERNS = [
  /-mb-1\b/,
  /-mb-2\b/,
  /-mb-px\b/,
  /mt-\[-1px\]/,
  /TabsList.*-mb-/,
];

const PATTERN_NAMES = [
  'negative margin bottom (-mb-1)',
  'negative margin bottom (-mb-2)', 
  'negative margin bottom (-mb-px)',
  'negative margin top (mt-[-1px])',
  'TabsList with negative margin bottom',
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function checkFile(filePath: string): { violations: Array<{ line: number; pattern: string; content: string }> } {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations: Array<{ line: number; pattern: string; content: string }> = [];

  lines.forEach((line, index) => {
    RISKY_PATTERNS.forEach((pattern, patternIndex) => {
      if (pattern.test(line)) {
        violations.push({
          line: index + 1,
          pattern: PATTERN_NAMES[patternIndex],
          content: line.trim()
        });
      }
    });
  });

  return { violations };
}

function main() {
  const srcPath = join(process.cwd(), 'src');
  const files = getAllFiles(srcPath);
  
  let totalViolations = 0;
  let hasViolations = false;

  console.log('🔍 Checking for risky TabsList spacing patterns...\n');

  files.forEach(file => {
    const { violations } = checkFile(file);
    
    if (violations.length > 0) {
      hasViolations = true;
      console.log(`❌ ${file.replace(process.cwd(), '.')}`);
      
      violations.forEach(violation => {
        console.log(`   Line ${violation.line}: ${violation.pattern}`);
        console.log(`   ${violation.content}`);
        console.log('');
        totalViolations++;
      });
    }
  });

  if (hasViolations) {
    console.log(`\n❌ Found ${totalViolations} TabsList spacing violations!`);
    console.log('\nTo fix these issues:');
    console.log('1. Replace negative margins (-mb-*, mt-[-*px]) with positive spacing (mb-2, mb-3)');
    console.log('2. Use PaneTabs component from @/components/admin/design/components/layouts/PaneTabs');
    console.log('3. Ensure TabsList never overlaps bordered containers below it');
    console.log('\nFor more details, see the safe patterns in PaneTabs.tsx');
    process.exit(1);
  } else {
    console.log('✅ No TabsList spacing violations found!');
    console.log('All tabs are using safe spacing patterns.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
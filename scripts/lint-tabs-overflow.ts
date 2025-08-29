#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  issue: string;
  context: string;
}

const violations: Violation[] = [];

// Anti-patterns to detect near TabsList usage
const ANTI_PATTERNS = [
  /overflow-x-auto[^}]*TabsList/,
  /overflow-hidden[^}]*TabsList/,
  /ScrollArea[^}]*TabsList/,
  /grid-cols-\[\d+px[^}]*TabsList/,
  /whitespace-nowrap[^}]*TabsTrigger/,
  /whitespace-nowrap[^}]*TabsList/,
];

// Required patterns that should exist
const REQUIRED_PATTERNS = [
  /min-w-0.*TabsList|TabsList.*min-w-0/,
  /flex-wrap.*TabsList|TabsList.*flex-wrap/,
];

function scanFile(filePath: string) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  if (filePath.includes('node_modules')) return;
  if (filePath.includes('.test.') || filePath.includes('__tests__')) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Look for TabsList usage
  const tabsListLines = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.includes('TabsList') || line.includes('TabsTrigger'));

  if (tabsListLines.length === 0) return;

  // Check for anti-patterns in a 5-line window around TabsList
  tabsListLines.forEach(({ idx: tabsLineIdx }) => {
    const start = Math.max(0, tabsLineIdx - 5);
    const end = Math.min(lines.length, tabsLineIdx + 5);
    const context = lines.slice(start, end).join('\n');

    ANTI_PATTERNS.forEach(pattern => {
      if (pattern.test(context)) {
        violations.push({
          file: filePath,
          line: tabsLineIdx + 1,
          issue: `Anti-pattern detected: ${pattern.source}`,
          context: lines[tabsLineIdx].trim()
        });
      }
    });

    // Check for missing required patterns
    const hasTabsList = lines[tabsLineIdx].includes('TabsList');
    if (hasTabsList) {
      const hasMinW0 = REQUIRED_PATTERNS[0].test(context);
      const hasFlexWrap = REQUIRED_PATTERNS[1].test(context);

      if (!hasMinW0) {
        violations.push({
          file: filePath,
          line: tabsLineIdx + 1,
          issue: 'Missing min-w-0 near TabsList',
          context: lines[tabsLineIdx].trim()
        });
      }

      if (!hasFlexWrap) {
        violations.push({
          file: filePath,
          line: tabsLineIdx + 1,
          issue: 'Missing flex-wrap near TabsList',
          context: lines[tabsLineIdx].trim()
        });
      }
    }
  });
}

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
}

// Main execution
console.log('🔍 Scanning for unsafe tab/button patterns...\n');

scanDirectory('./src');

if (violations.length === 0) {
  console.log('✅ No unsafe tab patterns detected!');
  process.exit(0);
} else {
  console.log(`❌ Found ${violations.length} potential issues:\n`);
  
  violations.forEach((violation, idx) => {
    console.log(`${idx + 1}. ${violation.file}:${violation.line}`);
    console.log(`   Issue: ${violation.issue}`);
    console.log(`   Context: ${violation.context}`);
    console.log();
  });
  
  console.log('Run with --fix to apply automated fixes (coming soon)');
  process.exit(1);
}
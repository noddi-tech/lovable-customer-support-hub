#!/usr/bin/env tsx

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Violation {
  file: string;
  line: number;
  issue: string;
  context: string;
}

// Patterns that indicate pane scroll issues
const ANTI_PATTERNS = [
  // Grid containers without proper height constraints
  /className=["'][^"']*grid[^"']*(?!.*h-full)[^"']*/,
  /className=["'][^"']*grid[^"']*(?!.*min-h-0)[^"']*/,
  // Pane wrappers without proper constraints
  /className=["'][^"']*(?:min-h-0|min-w-0)[^"']*(?!.*min-h-0.*min-w-0)[^"']*/,
  // Competing overflow on ancestors
  /className=["'][^"']*overflow-auto[^"']*/,
  /className=["'][^"']*overflow-y-auto[^"']*/,
];

const PATTERN_NAMES = [
  'Grid container missing h-full',
  'Grid container missing min-h-0', 
  'Pane wrapper incomplete constraints',
  'Competing overflow-auto found',
  'Competing overflow-y-auto found',
];

// Required patterns for pane grids
const REQUIRED_PATTERNS = [
  /data-testid=["']campaigns-grid["']/,
  /className=["'][^"']*h-full[^"']*/,
  /className=["'][^"']*min-h-0[^"']*/,
];

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Look for pane grid containers
    if (line.includes('campaigns-grid') || line.includes('grid') && line.includes('pane')) {
      // Check 5 lines window around grid containers
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      const window = lines.slice(start, end).join('\n');

      // Check for anti-patterns
      ANTI_PATTERNS.forEach((pattern, index) => {
        if (pattern.test(window)) {
          violations.push({
            file: filePath,
            line: lineNumber,
            issue: PATTERN_NAMES[index],
            context: line.trim()
          });
        }
      });

      // For grids, ensure required patterns are present
      if (line.includes('campaigns-grid')) {
        const hasHFull = /h-full/.test(window);
        const hasMinH0 = /min-h-0/.test(window);
        
        if (!hasHFull) {
          violations.push({
            file: filePath,
            line: lineNumber,
            issue: 'Grid missing h-full constraint',
            context: line.trim()
          });
        }
        
        if (!hasMinH0) {
          violations.push({
            file: filePath,
            line: lineNumber,
            issue: 'Grid missing min-h-0 constraint',
            context: line.trim()
          });
        }
      }
    }

    // Check for pane wrapper patterns
    if (line.includes('PaneColumn') || (line.includes('min-h-0') && line.includes('min-w-0'))) {
      const hasMinH0 = /min-h-0/.test(line);
      const hasMinW0 = /min-w-0/.test(line);
      
      if (hasMinH0 && !hasMinW0) {
        violations.push({
          file: filePath,
          line: lineNumber,
          issue: 'Pane wrapper missing min-w-0',
          context: line.trim()
        });
      }
      
      if (hasMinW0 && !hasMinH0) {
        violations.push({
          file: filePath,
          line: lineNumber,
          issue: 'Pane wrapper missing min-h-0',
          context: line.trim()
        });
      }
    }
  }

  return violations;
}

function scanDirectory(dir: string): Violation[] {
  let violations: Violation[] = [];
  
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!item.includes('node_modules')) {
        violations = violations.concat(scanDirectory(fullPath));
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      if (!item.includes('.test.') && !item.includes('.spec.')) {
        violations = violations.concat(scanFile(fullPath));
      }
    }
  }
  
  return violations;
}

function main() {
  console.log('🔍 Scanning for pane scroll violations...');
  
  const violations = scanDirectory('./src');
  
  if (violations.length > 0) {
    console.error(`❌ Found ${violations.length} pane scroll violations:`);
    console.error('');
    
    violations.forEach(violation => {
      console.error(`📁 ${violation.file}:${violation.line}`);
      console.error(`   Issue: ${violation.issue}`);
      console.error(`   Context: ${violation.context}`);
      console.error('');
    });
    
    console.error('💡 Fix these violations to ensure proper pane scrolling:');
    console.error('   - Grid containers need: h-full min-h-0');
    console.error('   - Pane wrappers need: min-h-0 min-w-0');
    console.error('   - Avoid overflow-auto on pane ancestors');
    console.error('   - Use PaneColumn/PaneScroll utilities');
    
    process.exit(1);
  } else {
    console.log('✅ No pane scroll violations found!');
    process.exit(0);
  }
}

main();
#!/usr/bin/env tsx

/**
 * Domain linter for pane scroll layout anti-patterns.
 *
 * Scope (intentionally narrow — see docs/layout/panes.md):
 * 1. `data-testid="campaigns-grid"` must sit near `h-full` + `min-h-0`
 * 2. Raw pane shells that set only one of `min-h-0` / `min-w-0` (not PaneColumn —
 *    that utility already applies both)
 * 3. PaneColumn / PaneScroll must not also set competing overflow-auto
 */

import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

interface Violation {
  file: string
  line: number
  issue: string
  context: string
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const content = readFileSync(filePath, "utf8")
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    if (line.includes("campaigns-grid")) {
      const start = Math.max(0, i - 2)
      const end = Math.min(lines.length, i + 3)
      const window = lines.slice(start, end).join("\n")

      if (!/\bh-full\b/.test(window)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          issue: "Grid container missing h-full",
          context: line.trim(),
        })
      }

      if (!/\bmin-h-0\b/.test(window)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          issue: "Grid container missing min-h-0",
          context: line.trim(),
        })
      }
    }

    // PaneColumn already includes min-h-0 min-w-0 — do not flag its call sites.
    // Only flag raw className shells that look like scroll panes and miss one axis.
    if (
      !line.includes("PaneColumn") &&
      !line.includes("PaneScroll") &&
      /className=/.test(line) &&
      /\bpane\b/.test(line)
    ) {
      const hasMinH0 = /\bmin-h-0\b/.test(line)
      const hasMinW0 = /\bmin-w-0\b/.test(line)

      if (hasMinH0 && !hasMinW0) {
        violations.push({
          file: filePath,
          line: lineNumber,
          issue: "Pane wrapper missing min-w-0",
          context: line.trim(),
        })
      }

      if (hasMinW0 && !hasMinH0) {
        violations.push({
          file: filePath,
          line: lineNumber,
          issue: "Pane wrapper missing min-h-0",
          context: line.trim(),
        })
      }
    }

    if (
      (line.includes("PaneColumn") || line.includes("PaneScroll")) &&
      (/\boverflow-auto\b/.test(line) || /\boverflow-y-auto\b/.test(line))
    ) {
      violations.push({
        file: filePath,
        line: lineNumber,
        issue: "Competing overflow on pane utility",
        context: line.trim(),
      })
    }
  }

  return violations
}

function scanDirectory(dir: string): Violation[] {
  let violations: Violation[] = []

  for (const item of readdirSync(dir)) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!item.includes("node_modules") && item !== "dist" && item !== "coverage") {
        violations = violations.concat(scanDirectory(fullPath))
      }
    } else if (item.endsWith(".tsx") || item.endsWith(".ts")) {
      if (!item.includes(".test.") && !item.includes(".spec.")) {
        violations = violations.concat(scanFile(fullPath))
      }
    }
  }

  return violations
}

function main() {
  console.log("🔍 Scanning for pane scroll violations...")

  const violations = scanDirectory("./src")

  if (violations.length > 0) {
    console.error(`❌ Found ${violations.length} pane scroll violations:`)
    console.error("")

    for (const violation of violations) {
      console.error(`📁 ${violation.file}:${violation.line}`)
      console.error(`   Issue: ${violation.issue}`)
      console.error(`   Context: ${violation.context}`)
      console.error("")
    }

    console.error("💡 Fix these violations to ensure proper pane scrolling:")
    console.error("   - Grid containers need: h-full min-h-0")
    console.error("   - Pane wrappers need: min-h-0 min-w-0")
    console.error("   - Avoid overflow-auto on pane ancestors")
    console.error("   - Use PaneColumn/PaneScroll utilities")

    process.exit(1)
  }

  console.log("✅ No pane scroll violations found!")
  process.exit(0)
}

main()

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      // Newsletter builder has known cycles; keep visible as warn until split.
      severity: "warn",
      comment: "Circular dependencies make refactors and HMR unreliable.",
      from: {},
      to: { circular: true },
    },
    {
      name: "widget-not-admin",
      severity: "error",
      comment: "Embeddable widget must not depend on admin/dashboard UI.",
      from: { path: "^src/widget" },
      to: {
        path: "^src/(components/(admin|dashboard)|pages|contexts|navigation)",
      },
    },
    {
      name: "no-src-to-supabase-functions",
      severity: "error",
      comment: "App code talks to edge functions over HTTP, not by importing Deno sources.",
      from: { path: "^src/" },
      to: { path: "^supabase/functions" },
    },
    {
      name: "no-pages-to-integrations-internals",
      severity: "warn",
      comment: "Prefer hooks/lib facades over deep integration imports from pages.",
      from: { path: "^src/pages" },
      to: {
        path: "^src/integrations/(aircall|navio)/.+",
        pathNot: "^src/integrations/(aircall|navio)/index\\.ts$",
      },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Likely dead modules — confirm with knip before deleting.",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)vite\\.config\\.(t|j)s$",
          "(^|/)vite\\.widget\\.config\\.(t|j)s$",
          "(^|/)vitest\\.config\\.(t|j)s$",
          "(^|/)playwright\\.config\\.(t|j)s$",
          "(^|/)eslint\\.config\\.(t|j)s$",
          "\\.dependency-cruiser\\.cjs$",
          "\\.stories\\.(t|j)sx?$",
          "(^|/)src/dev/",
          "(^|/)src/data/",
          "(^|/)scripts/",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: ["node_modules", "dist", "coverage", "supabase/migrations"],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}

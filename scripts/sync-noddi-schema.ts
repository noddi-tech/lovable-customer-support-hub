#!/usr/bin/env tsx
/**
 * Download the Noddi OpenAPI schema and save it locally.
 * Run: npx tsx scripts/sync-noddi-schema.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const SCHEMA_URL = 'https://api.noddi.co/docs/schema/?format=json';
const OUTPUT_PATH = 'docs/noddi-api-schema.json';

async function main() {
  console.log(`Fetching Noddi OpenAPI schema from ${SCHEMA_URL}...`);

  const resp = await fetch(SCHEMA_URL);
  if (!resp.ok) {
    console.error(`Failed to fetch schema: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }

  const schema = await resp.json();

  // Add sync metadata
  const output = {
    _meta: {
      synced_at: new Date().toISOString(),
      source: SCHEMA_URL,
    },
    ...schema,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`✅ Schema saved to ${OUTPUT_PATH}`);
  console.log(`   Synced at: ${output._meta.synced_at}`);
}

main().catch((err) => {
  console.error('Schema sync failed:', err);
  process.exit(1);
});

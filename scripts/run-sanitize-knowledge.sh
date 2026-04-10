#!/bin/bash
# Sanitize PII from all knowledge entries in batches of 20.
# Usage: bash scripts/run-sanitize-knowledge.sh
# Dry run: DRY_RUN=true bash scripts/run-sanitize-knowledge.sh

set -uo pipefail

URL="https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sanitize-knowledge-entries"
AUTH="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"
BATCH_SIZE=20
PAUSE=2
CURL_TIMEOUT=150
DRY_RUN="${DRY_RUN:-false}"

total_processed=0
total_failed=0
batch=0
consecutive_errors=0
MAX_CONSECUTIVE_ERRORS=5

echo "=== Knowledge Sanitizer: Starting (dryRun=$DRY_RUN) ==="
echo ""

while true; do
  batch=$((batch + 1))

  response=$(curl -s --max-time "$CURL_TIMEOUT" -X POST "$URL" \
    -H "Authorization: $AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"batchSize\":$BATCH_SIZE,\"dryRun\":$DRY_RUN}" || true)

  # Check for curl/network failure (includes timeout exit code 28)
  if [ -z "$response" ]; then
    consecutive_errors=$((consecutive_errors + 1))
    echo "Batch $batch: EMPTY RESPONSE ($consecutive_errors/$MAX_CONSECUTIVE_ERRORS) — retrying in 10s..."
    if [ "$consecutive_errors" -ge "$MAX_CONSECUTIVE_ERRORS" ]; then
      echo "Too many consecutive errors. Stopping."
      break
    fi
    sleep 10
    continue
  fi

  # Check for error response
  error=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo "parse_fail")
  if [ "$error" = "parse_fail" ]; then
    consecutive_errors=$((consecutive_errors + 1))
    echo "Batch $batch: PARSE ERROR ($consecutive_errors/$MAX_CONSECUTIVE_ERRORS) — response: ${response:0:200}"
    if [ "$consecutive_errors" -ge "$MAX_CONSECUTIVE_ERRORS" ]; then
      echo "Too many consecutive errors. Stopping."
      break
    fi
    sleep 10
    continue
  fi
  if [ -n "$error" ]; then
    echo "Batch $batch: ERROR — $error"
    echo "Stopping."
    break
  fi

  # Reset error counter on success
  consecutive_errors=0

  # Extract fields
  processed=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('processed',0))")
  failed=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('failed',0))")
  remaining=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('remaining',0))")
  message=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))")

  total_processed=$((total_processed + processed))
  total_failed=$((total_failed + failed))

  echo "Batch $batch: processed=$processed failed=$failed remaining=$remaining"

  # Show dry-run samples
  if [ "$DRY_RUN" = "true" ]; then
    echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for s in d.get('samples', []):
    print(f'  [{s[\"id\"][:8]}] ctx_changed={s[\"contextChanged\"]} resp_changed={s[\"responseChanged\"]}')
    if s['contextChanged']:
        print(f'    BEFORE: {s[\"original_context\"]}')
        print(f'    AFTER:  {s[\"sanitized_context\"]}')
" 2>/dev/null || true
    echo ""
    echo "=== Dry Run Complete ==="
    break
  fi

  if [ "$remaining" = "0" ] || [ "$processed" = "0" ]; then
    echo ""
    echo "=== Knowledge Sanitizer: Complete ==="
    break
  fi

  sleep "$PAUSE"
done

echo ""
echo "=== Final Totals ==="
echo "  Processed: $total_processed"
echo "  Failed:    $total_failed"
echo ""

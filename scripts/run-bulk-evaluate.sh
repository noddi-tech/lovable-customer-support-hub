#!/bin/bash
# Bulk-evaluate all pending knowledge entries in batches of 15.
# Usage: bash scripts/run-bulk-evaluate.sh

set -euo pipefail

URL="https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/bulk-evaluate-pending-entries"
AUTH="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE"
ORG_ID="b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b"
BATCH_SIZE=15
PAUSE=2

total_evaluated=0
total_promoted=0
total_flagged=0
total_archived=0
total_errors=0
batch=0

echo "=== Bulk Evaluate: Starting ==="
echo ""

while true; do
  batch=$((batch + 1))

  response=$(curl -s -X POST "$URL" \
    -H "Authorization: $AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"organizationId\":\"$ORG_ID\",\"batchSize\":$BATCH_SIZE,\"dryRun\":false}")

  # Check for curl/network failure
  if [ -z "$response" ]; then
    echo "Batch $batch: EMPTY RESPONSE — retrying in 10s..."
    sleep 10
    continue
  fi

  # Check for error response
  error=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo "parse_fail")
  if [ "$error" = "parse_fail" ]; then
    echo "Batch $batch: PARSE ERROR — response: ${response:0:200}"
    echo "Retrying in 10s..."
    sleep 10
    continue
  fi
  if [ -n "$error" ]; then
    echo "Batch $batch: ERROR — $error"
    echo "Stopping."
    break
  fi

  # Extract fields
  evaluated=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('evaluated',0))")
  promoted=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('promoted',0))")
  flagged=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('flagged',0))")
  archived=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('archived',0))")
  errors=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors',0))")
  remaining=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('remaining',0))")
  has_more=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hasMore',False))")

  total_evaluated=$((total_evaluated + evaluated))
  total_promoted=$((total_promoted + promoted))
  total_flagged=$((total_flagged + flagged))
  total_archived=$((total_archived + archived))
  total_errors=$((total_errors + errors))

  echo "Batch $batch: evaluated=$evaluated promoted=$promoted flagged=$flagged archived=$archived errors=$errors remaining=$remaining"

  if [ "$has_more" != "True" ]; then
    echo ""
    echo "=== Bulk Evaluate: Complete ==="
    break
  fi

  sleep "$PAUSE"
done

echo ""
echo "=== Final Totals ==="
echo "  Evaluated: $total_evaluated"
echo "  Promoted:  $total_promoted"
echo "  Flagged:   $total_flagged"
echo "  Archived:  $total_archived"
echo "  Errors:    $total_errors"
echo ""

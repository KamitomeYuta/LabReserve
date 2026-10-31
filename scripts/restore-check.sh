#!/usr/bin/env bash
# Run from repository root. Creates a NEW restore database, never overwrites source.
set -euo pipefail
restore_db="labreserve_restore_$(date +%Y%m%d%H%M%S)"
mkdir -p .local/backups
dump_file=".local/backups/${restore_db}.dump"
started=$(date +%s)
fingerprint_sql="SELECT md5(coalesce(string_agg(payload, E'\\n' ORDER BY payload),'')) FROM (SELECT 'users:'||row_to_json(t)::text AS payload FROM users t UNION ALL SELECT 'equipment:'||row_to_json(t)::text FROM equipment t UNION ALL SELECT 'reservations:'||row_to_json(t)::text FROM reservations t UNION ALL SELECT 'events:'||row_to_json(t)::text FROM reservation_events t) x;"
# Use a quiescent local demo for this comparison, so source does not change mid-drill.
source_fingerprint=$(docker compose exec -T db psql -U labreserve -d labreserve -Atc "$fingerprint_sql")
docker compose exec -T db pg_dump -U labreserve -d labreserve -Fc > "$dump_file"
docker compose exec -T db createdb -U labreserve "$restore_db"
docker compose exec -T db pg_restore -U labreserve -d "$restore_db" --no-owner --no-acl < "$dump_file"
restored_fingerprint=$(docker compose exec -T db psql -U labreserve -d "$restore_db" -Atc "$fingerprint_sql")
if [ "$source_fingerprint" != "$restored_fingerprint" ]; then
  echo 'Restore comparison failed (or source changed during drill)' >&2
  exit 1
fi
docker compose exec -T db psql -U labreserve -d "$restore_db" -c 'SELECT (SELECT count(*) FROM users) AS users,(SELECT count(*) FROM equipment) AS equipment,(SELECT count(*) FROM reservations) AS reservations,(SELECT count(*) FROM reservation_events) AS events;'
ended=$(date +%s)
echo "Restore verified: database=$restore_db elapsed_seconds=$((ended-started)) fingerprint=$restored_fingerprint backup=$dump_file"
echo 'Restore database retained for inspection. Source database untouched.'

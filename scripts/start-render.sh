#!/bin/sh
set -eu
export APP_ORIGIN="${APP_ORIGIN:-${RENDER_EXTERNAL_URL:?missing Render origin}}"
node apps/api/dist/apps/api/scripts/migrate.js
exec node apps/api/dist/apps/api/src/server.js

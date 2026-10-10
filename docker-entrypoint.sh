#!/bin/sh
set -eu

export ITCON26_DATE="$(date +%F)"
node scripts/seed.js --if-empty
exec node src/server.js

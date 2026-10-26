#!/usr/bin/env bash
# Start (of hergebruik) een lokaal Postgres 16-cluster voor de RLS-/functietests.
# Gebruik: scripts/pg-test.sh start|stop. Daarna: PGTEST_URL=postgres://postgres@127.0.0.1:54329/postgres npm run test:db
set -euo pipefail
DIR="${PGTEST_DIR:-/tmp/plateful-pgtest}"
PORT="${PGTEST_PORT:-54329}"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
[ -x "$BIN/postgres" ] || BIN="$(dirname "$(command -v postgres)")"
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
case "${1:-start}" in
  start)
    if [ ! -f "$DIR/PG_VERSION" ]; then
      mkdir -p "$DIR"; [ "$(id -u)" = 0 ] && chown postgres "$DIR"
      as_pg "$BIN/initdb" -D "$DIR" -U postgres --auth=trust >/dev/null
    fi
    if ! as_pg "$BIN/pg_ctl" -D "$DIR" status >/dev/null 2>&1; then
      as_pg "$BIN/pg_ctl" -D "$DIR" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$DIR/log" -w start >/dev/null
    fi
    echo "postgres://postgres@127.0.0.1:$PORT/postgres"
    ;;
  stop) as_pg "$BIN/pg_ctl" -D "$DIR" -m fast stop ;;
esac

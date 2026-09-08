#!/usr/bin/env bash
set -euo pipefail
ATLAS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ATLAS_SESSION=meridian-atlas
cd "$ATLAS_ROOT"
check_http() { curl --noproxy '*' --max-time 2 -fsS -o /dev/null http://127.0.0.1:4319/; }
case "${1:-status}" in
 start)
  if tmux has-session -t "=$ATLAS_SESSION" 2>/dev/null; then
   echo 'Meridian Atlas session already exists'
   exec bash "$ATLAS_ROOT/scripts/manage.sh" status
  fi
  test -f dist/server/wrangler.json || { echo 'Build first: npm run build'; exit 1; }
  if ss -H -ltn 'sport = :4319' | read -r _; then echo 'Port 4319 is occupied; no process was stopped.'; exit 1; fi
  mkdir -p work
  tmux new-session -d -s "$ATLAS_SESSION" -c "$ATLAS_ROOT" 'exec npm run start -- --ip 127.0.0.1 --port 4319 >> work/service.log 2>&1'
  for attempt in {1..30}; do
   if check_http 2>/dev/null; then echo 'Meridian Atlas ready: http://127.0.0.1:4319 (dedicated tmux session)'; exit 0; fi
   if ! tmux has-session -t "=$ATLAS_SESSION" 2>/dev/null; then echo 'Startup exited; inspect work/service.log'; exit 1; fi
   sleep 0.25
  done
  echo 'Startup did not become ready; inspect work/service.log'; exit 1
  ;;
 stop)
  if tmux has-session -t "=$ATLAS_SESSION" 2>/dev/null; then
   tmux kill-session -t "=$ATLAS_SESSION"
   for attempt in {1..50}; do
    if ! ss -H -ltn 'sport = :4319' | read -r _; then exit 0; fi
    sleep 0.1
   done
   echo 'Port has not been released; no additional process was killed.'; exit 1
  fi
  ;;
 restart)
  bash "$ATLAS_ROOT/scripts/manage.sh" stop
  exec bash "$ATLAS_ROOT/scripts/manage.sh" start
  ;;
 status)
  tmux has-session -t "=$ATLAS_SESSION" 2>/dev/null || { echo 'Meridian Atlas session is not running'; exit 1; }
  tmux list-sessions -F '#{session_name}: #{session_windows} windows' | grep '^meridian-atlas:'
  ss -H -ltnp 'sport = :4319'
  check_http && echo 'HTTP 200'
  ;;
 logs) tail -80 work/service.log ;;
 *) echo 'Usage: bash scripts/manage.sh {start|stop|restart|status|logs}'; exit 2 ;;
esac

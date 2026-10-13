#!/usr/bin/env bash
# Post-deploy smoke test. Usage: BASE_URL=https://your-app.onrender.com bash scripts/smoke.sh
# Optional: EMAIL / PASSWORD of an existing VERIFIED account to also test login + /me + trial list.
set -u
BASE_URL="${BASE_URL:-http://localhost:8080}"
pass=0; fail=0
check() { # name expected_status actual_status
  if [ "$2" = "$3" ]; then echo "PASS  $1 ($3)"; pass=$((pass+1)); else echo "FAIL  $1 (expected $2, got $3)"; fail=$((fail+1)); fi
}
status() { curl -s -o /dev/null -m 60 -w '%{http_code}' "$@"; }

echo "Target: $BASE_URL (first request may take ~30s if Render was asleep)"
check "health"                200 "$(status "$BASE_URL/api/health")"
check "unknown route"         404 "$(status "$BASE_URL/api/nope")"
check "me needs auth"         401 "$(status "$BASE_URL/api/auth/me")"
check "trials need auth"      401 "$(status "$BASE_URL/api/trials")"
check "admin needs auth"      401 "$(status "$BASE_URL/api/admin/stats")"
check "bad signup rejected"   400 "$(status -X POST -H 'content-type: application/json' -d '{"email":"nope"}' "$BASE_URL/api/auth/signup")"
check "missing share 404"     404 "$(status "$BASE_URL/api/shares/AAAAAAAAAA")"

if [ -n "${EMAIL:-}" ] && [ -n "${PASSWORD:-}" ]; then
  body=$(curl -s -m 30 -X POST -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" "$BASE_URL/api/auth/login")
  token=$(printf '%s' "$body" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  if [ -n "$token" ]; then
    echo "PASS  login"; pass=$((pass+1))
    check "me with token"   200 "$(status -H "authorization: Bearer $token" "$BASE_URL/api/auth/me")"
    check "list trials"     200 "$(status -H "authorization: Bearer $token" "$BASE_URL/api/trials")"
  else
    echo "FAIL  login (no token)"; fail=$((fail+1))
  fi
fi

echo "---- $pass passed, $fail failed"
[ "$fail" -eq 0 ]

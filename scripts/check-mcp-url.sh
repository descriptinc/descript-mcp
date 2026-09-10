#!/usr/bin/env sh
# Asserts the MCP server URL is identical everywhere it appears:
# mcp.json, the README, and the base64-encoded Cursor deep link in the README.
set -eu

expected="https://api.descript.com/v2/mcp"

mcp_json_url=$(node -e 'console.log(require("./mcp.json").mcpServers.descript.url)')
readme_urls=$(grep -oE 'https://api\.descript\.com/v2/mcp[^ )`"]*' README.md AGENTS.md rules/*.mdc skills/*/SKILL.md | cut -d: -f2- | sort -u)
deeplink_b64=$(grep -oE 'config=[A-Za-z0-9+/=]+' README.md | head -1 | cut -d= -f2-)
deeplink_url=$(printf '%s' "$deeplink_b64" | base64 -d | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).url))')

fail=0
[ "$mcp_json_url" = "$expected" ] || { echo "mcp.json url is $mcp_json_url"; fail=1; }
[ "$deeplink_url" = "$expected" ] || { echo "Cursor deep link decodes to $deeplink_url"; fail=1; }
for u in $readme_urls; do
  [ "$u" = "$expected" ] || { echo "unexpected server URL in docs: $u"; fail=1; }
done
grep -rlE 'api\.descript\.com' . --exclude-dir=.git --exclude-dir=.github --exclude=check-mcp-url.sh \
  | while read -r f; do grep -oE 'https?://[a-z0-9.-]*api\.descript\.com[^ )`"]*' "$f"; done \
  | sort -u | grep -vx "$expected" && { echo "stray api.descript.com URL above"; fail=1; } || true

[ "$fail" -eq 0 ] && echo "MCP URL consistent: $expected"
exit "$fail"

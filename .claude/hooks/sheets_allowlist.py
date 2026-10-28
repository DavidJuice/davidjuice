#!/usr/bin/env python3
"""PreToolUse hook: restrict Google Sheets MCP calls to allowlisted spreadsheet IDs. Fails closed."""
import json, sys

ALLOWED = {"1HeKXGGbrkEmdy4t_Me0A0uB7F7TFzNBZriYdYSK15e8"}
ID_KEYS = ("spreadsheetId", "spreadsheet_id", "destinationSpreadsheetId", "destination_spreadsheet_id")

def ids(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ID_KEYS and isinstance(v, str):
                yield v
            else:
                yield from ids(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from ids(v)

def deny(reason):
    print(reason, file=sys.stderr)
    sys.exit(2)

try:
    data = json.load(sys.stdin)
except Exception:
    deny("sheets_allowlist: unreadable hook input; blocked")

found = set(ids(data.get("tool_input", {})))
if not found:
    deny("sheets_allowlist: no spreadsheet ID in call; blocked")
bad = found - ALLOWED
if bad:
    deny(f"sheets_allowlist: spreadsheet(s) {sorted(bad)} not allowed in this project")
sys.exit(0)

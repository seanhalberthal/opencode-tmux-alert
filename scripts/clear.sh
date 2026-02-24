#!/usr/bin/env bash
# Clear the tmux alert for the current window.

set -euo pipefail

PANE_ID="${TMUX_PANE:-}"
[ -z "$PANE_ID" ] && exit 0

tmux set-option -w -t "$PANE_ID" @opencode-alert 0 2>/dev/null || true

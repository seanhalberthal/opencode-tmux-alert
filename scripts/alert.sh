#!/usr/bin/env bash
# Trigger a tmux alert for the current window.
#
# Sets the user option @opencode-alert to "1" and sends a bell character.
# Use #{@opencode-alert} in your tmux status format to show a visual indicator.

set -euo pipefail

PANE_ID="${TMUX_PANE:-}"
[ -z "$PANE_ID" ] && exit 0

# Set a user option that can be read from the tmux status line
tmux set-option -w -t "$PANE_ID" @opencode-alert 1 2>/dev/null || true

# Send bell — triggers tmux monitor-bell and visual-bell
printf '\a'

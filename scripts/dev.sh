#!/usr/bin/env bash
# Run the Swift menu-bar app in dev mode against the in-tree Node daemon.
# No bundled .app, no autostart — just `swift run` plus a Node child.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="${WALLE_NODE_PATH:-$(command -v node || true)}"

if [ -z "$NODE_BIN" ]; then
  echo "no node found; install Node.js or set WALLE_NODE_PATH" >&2
  exit 1
fi

export WALLE_NODE_PATH="$NODE_BIN"
export WALLE_DAEMON_PATH="$ROOT/index.js"

echo "Node:   $NODE_BIN"
echo "Daemon: $ROOT/index.js"
echo "Config: ${WALLE_CONFIG_DIR:-$HOME/Library/Application Support/wall-e}"

cd "$ROOT/swift"
exec swift run -c release WallE

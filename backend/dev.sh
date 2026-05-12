#!/bin/bash
set -euo pipefail

# =====================================================================
# Indic-Chat: Developer Server Launcher
# =====================================================================
# Hardened wrapper for uvicorn that prevents orphaned background 
# workers, guards against port collisions, and verifies environment 
# sanity before booting.
#
# Usage:
#   ./dev.sh         -> Normal boot (Full pre-warming)
#   ./dev.sh --fast  -> Fast boot (Skips heavy LLM pre-warming)
# =====================================================================

# Configuration
VENV_PATH="/home/Dragon/Coding/Indic-chat/.venv"
SERVER_PORT=8000
export OLLAMA_BASE_URL="http://localhost:11434"

# Argument Parsing
if [[ "${1:-}" == "--fast" ]]; then
    export SKIP_PREWARM="true"
    echo "⚡ Fast Dev Mode Enabled (SKIP_PREWARM=true)"
    echo "Heavy models will load lazily on first request."
else
    # Default to standard full load
    export SKIP_PREWARM="false"
    echo "🐢 Full Dev Mode Enabled (SKIP_PREWARM=false)"
fi

echo "──────────────────────────────────────────────"

# 1. Port Guard (Collision Prevention)
# The training space guarantees we match exactly port 8000 and not 80001
if ss -tln | grep -q ":$SERVER_PORT "; then
    echo "❌ ERROR: Port $SERVER_PORT is already in use by another process."
    echo "Run 'ss -tlnp | grep :$SERVER_PORT' to find what's holding it."
    exit 1
fi

# 2. Venv Activation
if [ -f "$VENV_PATH/bin/activate" ]; then
    source "$VENV_PATH/bin/activate"
    echo "✅ Virtual environment activated."
else
    echo "❌ ERROR: Venv not found at $VENV_PATH"
    echo "Please set up your Python environment first."
    exit 1
fi

# 3. Environment & Model Pre-flight
echo "✈️ Running pre-flight checks..."
python3 pre_flight.py || { echo "❌ Pre-flight failed. Halting startup."; exit 1; }

echo "──────────────────────────────────────────────"
echo "🚀 Starting Uvicorn with auto-reload..."
echo "Press Ctrl+C to safely terminate all workers."
echo "──────────────────────────────────────────────"

# Define Cleanup Trap
cleanup() {
    echo -e "\n🛑 Signal received. Terminating process group (PGID: $SERVER_PID)..."
    # Kill the entire process group created by setsid to ensure
    # that uvicorn master and all --reload worker children die atomically.
    kill -TERM -- -$SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo "✅ Clean shutdown complete."
}
# Catch normal exit, Ctrl+C (INT), and Kill (TERM)
trap cleanup EXIT INT TERM

# 4. Launch Uvicorn in a new Process Group
# Using setsid isolates uvicorn and its reload workers into their own process 
# group where PGID == PID. This allows atomic cleanup.
setsid "$VENV_PATH/bin/uvicorn" app.main:app --host 0.0.0.0 --port $SERVER_PORT --reload &
SERVER_PID=$!

# Wait for the background process (Streams stdout to terminal and catches Ctrl+C)
wait $SERVER_PID || true

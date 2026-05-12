import os
import sys
import requests
import time

def check_venv():
    print("--- Checking Venv ---")
    venv_path = os.environ.get("VIRTUAL_ENV", "")
    if not venv_path:
        # Fallback check for the expected path
        expected = "/home/Dragon/Coding/Indic-chat/.venv"
        actual_py = sys.executable
        if expected in actual_py:
            print(f"OK: Using python from {actual_py}")
        else:
            print(f"ERROR: Not running inside expected venv. Python: {actual_py}")
            sys.exit(1)
    else:
        print(f"OK: Venv active at {venv_path}")

def check_inotify():
    print("--- Checking Inotify ---")
    try:
        with open("/proc/sys/fs/inotify/max_user_watches", "r") as f:
            limit = int(f.read().strip())
            if limit < 524288:
                print(f"WARNING: inotify limit is low ({limit}). Recommended: 524288")
                print("Advice: Run 'sudo sysctl fs.inotify.max_user_watches=524288' on host.")
            else:
                print(f"OK: inotify limit is {limit}")
    except FileNotFoundError:
        print("SKIP: /proc/sys/fs/inotify not found (maybe not Linux/WSL).")

def check_ollama():
    print("--- Checking Ollama Vitality ---")
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "gemma4:e2b")
    
    try:
        # 1. Basic Upstream Ping
        resp = requests.get(f"{base_url}/api/tags", timeout=5)
        resp.raise_for_status()
        print("OK: Ollama server is up.")
        
        # 2. Model Vitality Check (trivial generation)
        print(f"Ping model '{model}'...")
        gen_payload = {
            "model": model,
            "prompt": "ping",
            "stream": False
        }
        start = time.time()
        resp = requests.post(f"{base_url}/api/generate", json=gen_payload, timeout=60)
        resp.raise_for_status()
        elapsed = time.time() - start
        print(f"OK: Model '{model}' responded in {elapsed:.2f}s")
        
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Ollama/Model check failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_venv()
    check_inotify()
    # check_ollama()
    print("\nPre-flight checks passed.")

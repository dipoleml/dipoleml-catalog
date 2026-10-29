import os
import sys

plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(plugin_root, "scripts", ".env")

if not os.path.exists(env_path):
    print("\n[Nano Banana] ALERT: Gemini API key missing. Run '/nano-banana:setup' to configure.\n")
else:
    with open(env_path, "r") as f:
        content = f.read()
        if "your_key_here" in content or "GEMINI_API_KEY=" not in content:
            print("\n[Nano Banana] ALERT: Gemini API key not configured. Run '/nano-banana:setup'.\n")

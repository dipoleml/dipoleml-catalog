import sys
import os
from utils import get_env_path

def setup(api_key):
    env_path = get_env_path()
    os.makedirs(os.path.dirname(env_path), exist_ok=True)
    
    # Simple validation
    if not api_key.startswith("AIza"):
        print("\n[Nano Banana] WARNING: That doesn't look like a standard Gemini API key.")
        print("Standard keys usually start with 'AIza'. Proceeding anyway...\n")

    with open(env_path, "w") as f:
        f.write(f"GEMINI_API_KEY={api_key}\n")
    
    print(f"\n[Nano Banana] SUCCESS: API key saved to {env_path}")
    print("You can now start generating images!\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python setup_key.py <API_KEY>")
        sys.exit(1)
    setup(sys.argv[1])

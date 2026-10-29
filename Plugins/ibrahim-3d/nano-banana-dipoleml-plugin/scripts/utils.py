import os
import sys
from dotenv import load_dotenv
from google import genai

# Models
# Nano Banana 2: High-efficiency, fast, 3.1 Flash.
NANO_BANANA_2 = "gemini-3.1-flash-image-preview"
# Nano Banana Pro: Professional quality, advanced reasoning, 3 Pro.
NANO_BANANA_PRO = "gemini-3-pro-image-preview"

def get_plugin_root():
    return os.environ.get("CLAUDE_PLUGIN_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_env_path():
    return os.path.join(get_plugin_root(), "scripts", ".env")

def get_client():
    load_dotenv(get_env_path())
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        print("\n[Nano Banana] ERROR: Gemini API key not found or not configured.")
        print("Please run '/nano-banana:setup' to configure your API key.")
        print(f"Or create a .env file at {get_env_path()} with 'GEMINI_API_KEY=your_key'\n")
        sys.exit(1)
    return genai.Client(api_key=api_key)

---
name: setup
description: Setup the Gemini API key for Nano Banana
user_invocable: true
allowed-tools:
  - Bash
  - AskUserQuestion
---

I will help you set up your Gemini API key for Nano Banana.

If you already have your key, you can provide it as an argument: `/nano-banana:setup YOUR_KEY`

Otherwise, I will ask you for it now.

### Your Task
1. Check if an API key was provided in `$ARGUMENTS`.
2. If not, use `AskUserQuestion` to get it (inform the user they can get one for free at https://aistudio.google.com/apikey).
3. Run: `python "$CLAUDE_PLUGIN_ROOT/scripts/setup_key.py" <key>`
4. Confirm to the user that setup is complete.

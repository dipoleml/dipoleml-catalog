#!/bin/bash
set -e
echo ""
echo "⚡ AutoCode Setup"
echo ""

echo "[1/4] Updating system..."
apt-get update -qq > /dev/null 2>&1

echo "[2/4] Installing tools..."
apt-get install -y -qq git curl wget > /dev/null 2>&1
git config --global url."https://github.com/".insteadOf "git@github.com:"
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keyscan -t rsa,ecdsa,ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null
chmod 600 ~/.ssh/known_hosts

echo "[3/4] Installing Node.js..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
fi
echo "       Node.js: $(node --version 2>/dev/null)"

echo "[4/4] Installing Claude Code..."
if ! command -v claude &> /dev/null; then
  npm install -g @anthropic-ai/claude-code > /dev/null 2>&1
fi
echo "       Claude Code: $(claude --version 2>/dev/null)"

echo ""
echo "=========================================="
echo ""
echo "  ✅ Done! Now:"
echo ""
echo "  ① Type: claude"
echo "     (Log in when prompted)"
echo ""
echo "  ② After login, say:"
echo "     Install the AutoCode plugin from github.com/ilang-ai/autocode"
echo ""
echo "  Then tell it what you want to build!"
echo ""
echo "  ---"
echo ""
echo "  ✅ 完成！现在："
echo ""
echo "  ① 输入 claude 回车"
echo "     （按提示登录）"
echo ""
echo "  ② 登录后说："
echo "     帮我安装autocode插件，地址 github.com/ilang-ai/autocode"
echo ""
echo "  然后直接说你想做什么！"
echo ""
echo "=========================================="

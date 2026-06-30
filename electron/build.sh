#!/bin/bash
# LabMS Electron build script
#
# Usage:
#   bash electron/build.sh mac       → .dmg  (arm64 + x64)  [macOS only]
#   bash electron/build.sh win       → .exe  (x64)           [macOS/Linux + Wine, or Windows]
#   bash electron/build.sh linux     → .AppImage + .deb      [Linux only]
#   bash electron/build.sh all       → all platforms         [macOS host recommended]
#
# Note: native modules (@libsql, sharp) are platform-specific.
# For truly portable builds across all three OS targets, use the
# GitHub Actions workflow (.github/workflows/release.yml) which runs
# each target on its native runner.
#
# Requires: node, npm, electron-builder

set -e

PLATFORM=${1:-mac}
cd "$(dirname "$0")/.."   # run from project root regardless of call site

echo "🔨 Building LabMS for: $PLATFORM"

# ── 1. Build Next.js standalone ─────────────────────────────────────────
echo "📦 Building Next.js standalone..."
npm run build

# ── 2. Copy static assets into standalone ───────────────────────────────
# Next.js standalone does NOT include .next/static or public automatically.
echo "📂 Copying static assets into standalone..."
cp -r .next/static .next/standalone/.next/static
cp -r public         .next/standalone/public

# ── 3. Build Electron installer ─────────────────────────────────────────
echo "🖥️  Running electron-builder..."
case $PLATFORM in
  mac)
    npx electron-builder build --mac --publish never
    ;;
  win)
    npx electron-builder build --win --publish never
    ;;
  linux)
    npx electron-builder build --linux --publish never
    ;;
  all)
    # Builds all targets sequentially on the current host.
    # .dmg requires macOS; Windows target needs Wine on non-Windows hosts.
    npx electron-builder build --mac --win --linux --publish never
    ;;
  *)
    echo "❌ Unknown platform: '$PLATFORM'"
    echo "   Usage: bash electron/build.sh [mac|win|linux|all]"
    exit 1
    ;;
esac

# ── 4. Summary ──────────────────────────────────────────────────────────
echo ""
echo "✅ Build complete! Artifacts in dist-electron/:"
ls -lh dist-electron/*.exe dist-electron/*.dmg dist-electron/*.AppImage dist-electron/*.deb 2>/dev/null || ls -lh dist-electron/

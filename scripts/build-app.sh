#!/usr/bin/env bash
# Build a distributable WallE.app bundle.
#
#   ./scripts/build-app.sh              # build for the host arch only
#   UNIVERSAL=1 ./scripts/build-app.sh  # build a universal arm64+x86_64 binary
#   DMG=1 ./scripts/build-app.sh        # also produce a DMG
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SWIFT_DIR="$ROOT/swift"
DIST_DIR="$ROOT/dist"
APP_DIR="$DIST_DIR/WallE.app"
NODE_VERSION="${NODE_VERSION:-20.18.0}"
UNIVERSAL="${UNIVERSAL:-0}"
DMG="${DMG:-0}"
APP_VERSION="${APP_VERSION:-2.0.0}"
BUNDLE_ID="${BUNDLE_ID:-com.wall-e.app}"

HOST_ARCH="$(uname -m)"
case "$HOST_ARCH" in
  arm64)  HOST_TRIPLE="arm64-apple-macosx"; NODE_HOST_ARCH="arm64" ;;
  x86_64) HOST_TRIPLE="x86_64-apple-macosx"; NODE_HOST_ARCH="x64" ;;
  *) echo "unsupported host arch: $HOST_ARCH"; exit 1 ;;
esac

echo "==> Cleaning $DIST_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"
mkdir -p "$APP_DIR/Contents/Resources/daemon"

# ── Swift binary ──────────────────────────────────────────────────────────────
echo "==> Building Swift release binary"
pushd "$SWIFT_DIR" > /dev/null

if [ "$UNIVERSAL" = "1" ]; then
  swift build -c release --arch arm64 --arch x86_64
  SWIFT_BIN="$SWIFT_DIR/.build/apple/Products/Release/WallE"
else
  swift build -c release
  SWIFT_BIN="$SWIFT_DIR/.build/release/WallE"
fi

popd > /dev/null

if [ ! -x "$SWIFT_BIN" ]; then
  echo "Swift binary not found at $SWIFT_BIN"
  exit 1
fi
cp "$SWIFT_BIN" "$APP_DIR/Contents/MacOS/WallE"

# ── Node runtime ──────────────────────────────────────────────────────────────
fetch_node() {
  local arch="$1"
  local out_dir="$2"
  local tarball="node-v${NODE_VERSION}-darwin-${arch}.tar.xz"
  local url="https://nodejs.org/dist/v${NODE_VERSION}/${tarball}"
  local extracted="$out_dir/node-v${NODE_VERSION}-darwin-${arch}/bin/node"
  if [ ! -x "$extracted" ]; then
    echo "==> Downloading $tarball" >&2
    mkdir -p "$out_dir"
    curl -fsSL "$url" -o "$out_dir/$tarball"
    tar -xf "$out_dir/$tarball" -C "$out_dir"
  fi
  echo "$extracted"
}

NODE_CACHE="$DIST_DIR/.node-cache"
mkdir -p "$NODE_CACHE"

if [ "$UNIVERSAL" = "1" ]; then
  ARM_NODE="$(fetch_node arm64 "$NODE_CACHE")"
  X64_NODE="$(fetch_node x64 "$NODE_CACHE")"
  echo "==> lipo arm64 + x86_64 Node into universal binary"
  lipo -create "$ARM_NODE" "$X64_NODE" -output "$APP_DIR/Contents/Resources/node"
else
  HOST_NODE="$(fetch_node "$NODE_HOST_ARCH" "$NODE_CACHE")"
  cp "$HOST_NODE" "$APP_DIR/Contents/Resources/node"
fi
chmod +x "$APP_DIR/Contents/Resources/node"

# ── Daemon code + production deps ─────────────────────────────────────────────
echo "==> Copying daemon source"
cp "$ROOT/index.js"     "$APP_DIR/Contents/Resources/daemon/index.js"
cp "$ROOT/package.json" "$APP_DIR/Contents/Resources/daemon/package.json"
cp -R "$ROOT/src"       "$APP_DIR/Contents/Resources/daemon/src"

echo "==> Installing production deps"
pushd "$APP_DIR/Contents/Resources/daemon" > /dev/null
if [ -f "$ROOT/package-lock.json" ]; then
  cp "$ROOT/package-lock.json" .
  npm ci --omit=dev --no-audit --no-fund > /dev/null
else
  npm install --omit=dev --no-audit --no-fund > /dev/null
fi
popd > /dev/null

# ── Info.plist ────────────────────────────────────────────────────────────────
cat > "$APP_DIR/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key><string>en</string>
    <key>CFBundleExecutable</key><string>WallE</string>
    <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
    <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
    <key>CFBundleName</key><string>WallE</string>
    <key>CFBundleDisplayName</key><string>WALL-E</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>${APP_VERSION}</string>
    <key>CFBundleVersion</key><string>${APP_VERSION}</string>
    <key>LSMinimumSystemVersion</key><string>13.0</string>
    <key>LSUIElement</key><true/>
    <key>NSHighResolutionCapable</key><true/>
    <key>NSPrincipalClass</key><string>NSApplication</string>
    <key>NSSupportsAutomaticTermination</key><false/>
    <key>NSSupportsSuddenTermination</key><false/>
</dict>
</plist>
EOF

# ── Optional: ad-hoc sign so it launches without library validation issues ────
echo "==> Ad-hoc codesigning"
codesign --deep --force --sign - "$APP_DIR" 2>&1 | tail -5

echo "==> $APP_DIR built successfully"
echo "    Run:    open $APP_DIR"
echo "    Verify: lipo -info \"$APP_DIR/Contents/MacOS/WallE\""
echo "            lipo -info \"$APP_DIR/Contents/Resources/node\""

# ── Optional DMG ──────────────────────────────────────────────────────────────
if [ "$DMG" = "1" ]; then
  DMG_PATH="$DIST_DIR/WallE-${APP_VERSION}.dmg"
  echo "==> Building DMG at $DMG_PATH"
  rm -f "$DMG_PATH"
  hdiutil create -volname "WallE" -srcfolder "$APP_DIR" -ov -format UDZO "$DMG_PATH" > /dev/null
  echo "    DMG: $DMG_PATH"
fi

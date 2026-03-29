#!/bin/bash
# Build script — packages the webinterface.plex addon into a zip for Kodi installation
# Usage: bash build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADDON_DIR="$SCRIPT_DIR/webinterface.plex"
OUTPUT_DIR="$SCRIPT_DIR/dist"
STAGING_DIR="$OUTPUT_DIR/webinterface.plex"

# Extract version from addon.xml
VERSION=$(grep -oP 'version="\K[^"]+' "$ADDON_DIR/addon.xml" | head -1)
echo "Version: $VERSION"

ZIP_NAME="webinterface.plex-v${VERSION}.zip"
ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"

# Clean previous build
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy addon to staging
echo "Copying to staging..."
cp -r "$ADDON_DIR" "$STAGING_DIR"

# Concatenate JS files in load order
echo "Concatenating JS files..."
JS_ORDER=(
    kodi-api.js state.js views.js detail.js player.js
    search.js livetv.js ratings.js websocket.js settings.js
    playlists.js genres.js photos.js shortcuts.js app-boot.js
)
JS_DIR="$STAGING_DIR/js"
BUNDLE="$JS_DIR/app.bundle.js"
> "$BUNDLE"
for f in "${JS_ORDER[@]}"; do
    if [ -f "$JS_DIR/$f" ]; then
        echo "// --- $f ---" >> "$BUNDLE"
        cat "$JS_DIR/$f" >> "$BUNDLE"
        echo "" >> "$BUNDLE"
        rm "$JS_DIR/$f"
    fi
done
echo "  Bundled ${#JS_ORDER[@]} JS files -> js/app.bundle.js"

# Update index.html to use single bundled script
INDEX="$STAGING_DIR/index.html"
# Replace block of individual script tags with single bundle tag
sed -i 's|<script src="js/kodi-api\.js"></script>|<script src="js/app.bundle.js"></script>|' "$INDEX"
sed -i '/<script src="js\/\(state\|views\|detail\|player\|search\|livetv\|ratings\|websocket\|settings\|playlists\|genres\|photos\|shortcuts\|app-boot\)\.js"><\/script>/d' "$INDEX"

# Create the zip (Kodi expects the addon folder as the root inside the zip)
echo "Packaging addon..."
cd "$OUTPUT_DIR"
zip -r "$ZIP_PATH" webinterface.plex/ -x "*.DS_Store" "*__MACOSX*"

# Clean staging
rm -rf "$STAGING_DIR"

SIZE=$(du -h "$ZIP_PATH" | cut -f1)
echo ""
echo "Build complete!"
echo "  Output: $ZIP_PATH"
echo "  Size:   $SIZE"
echo ""
echo "Install in Kodi:"
echo "  1. Copy $ZIP_NAME to your OSMC device (e.g. scp $ZIP_NAME osmc@<ip>:~/ )"
echo "  2. Settings -> Add-ons -> Install from zip file"
echo "  3. Select $ZIP_NAME"
echo "  4. Settings -> Services -> Control -> Web interface -> Select 'Plex Web Interface'"

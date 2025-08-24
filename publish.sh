#!/bin/bash

# LogUI Publish Script
# This script builds the app and sets up global CLI access

set -e

echo "🏗️  Building LogUI..."

# Build the project
npm run build

echo "✅ Build completed"

# Get the current directory
LOGUI_DIR=$(pwd)

# Create a global bin directory if it doesn't exist
GLOBAL_BIN_DIR="$HOME/.local/bin"
mkdir -p "$GLOBAL_BIN_DIR"

# Create the global logui command
GLOBAL_LOGUI_SCRIPT="$GLOBAL_BIN_DIR/logui"

echo "📝 Creating global logui command at $GLOBAL_LOGUI_SCRIPT"

cat > "$GLOBAL_LOGUI_SCRIPT" << EOF
#!/bin/bash
# Global LogUI launcher
cd "$LOGUI_DIR"
node bin/logui.js "\$@"
EOF

# Make it executable
chmod +x "$GLOBAL_LOGUI_SCRIPT"

echo "🔧 Setting up PATH in ~/.zshrc"

# Add to PATH in zshrc if not already there
ZSHRC_FILE="$HOME/.zshrc"
PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'

if [ -f "$ZSHRC_FILE" ]; then
    if ! grep -q "$HOME/.local/bin" "$ZSHRC_FILE"; then
        echo "" >> "$ZSHRC_FILE"
        echo "# Added by LogUI publish script" >> "$ZSHRC_FILE"
        echo "$PATH_LINE" >> "$ZSHRC_FILE"
        echo "✅ Added $HOME/.local/bin to PATH in ~/.zshrc"
    else
        echo "ℹ️  PATH already includes $HOME/.local/bin"
    fi
else
    echo "$PATH_LINE" > "$ZSHRC_FILE"
    echo "✅ Created ~/.zshrc and added PATH"
fi

echo ""
echo "🎉 LogUI has been published successfully!"
echo ""
echo "To use globally, run:"
echo "  source ~/.zshrc"
echo ""
echo "Then you can use:"
echo "  logui --tail /path/to/your/file.log"
echo "  logui --tail file.log"
echo ""
echo "Or just start LogUI and upload a file:"
echo "  logui"
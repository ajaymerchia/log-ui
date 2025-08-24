#!/bin/bash

echo "🚀 Installing LogUI..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    echo "   Please install npm (comes with Node.js)"
    exit 1
fi

echo "✅ Node.js and npm detected"
echo ""

# Install LogUI globally
echo "📦 Installing LogUI globally..."
npm install -g logui

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 LogUI installed successfully!"
    echo ""
    echo "Usage:"
    echo "  logui [file.log]          # Tail a specific log file"
    echo "  logui --demo              # Run with sample data"
    echo ""
    echo "Example:"
    echo "  tail -f /var/log/app.log | logui"
    echo "  # Then open http://localhost:3001 in your browser"
    echo ""
else
    echo ""
    echo "❌ Installation failed. Please check the error above."
    exit 1
fi
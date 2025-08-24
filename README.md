# LogUI 📊

Beautiful, real-time log tailing interface inspired by Linear and Stripe's design aesthetic.

![LogUI Preview](https://via.placeholder.com/800x500/0D1117/5E6AD2?text=LogUI+Preview)

## ✨ Features

- **🎨 Beautiful Interface** - Clean, modern design with smooth animations
- **⚡ Real-time Streaming** - WebSocket-based live log tailing
- **🔍 Smart Filtering** - Filter by log levels, tags, time ranges, and search
- **📈 Timeline View** - Visual timeline with log density indicators
- **🏷️ Tag Support** - Automatic extraction of `[tag]` patterns
- **📱 Responsive Design** - Works on desktop and mobile
- **🎯 Log Level Highlighting** - Color-coded ERROR, WARN, INFO, DEBUG levels
- **⌨️ Keyboard Shortcuts** - Command palette (⌘K) and quick actions
- **🔄 Auto-scroll** - Toggle automatic scrolling for new logs
- **💾 Local First** - No external dependencies, runs entirely locally

## 🚀 Quick Start

```bash
# Install globally with npm
npm install -g log-ui

# Tail any log file
logui /path/to/your/logfile.log

# Try the demo with generated logs
logui --demo

# Or try specific demo types
logui --demo bigfile        # Large file performance test
logui --demo stack-traces   # Error logs with stack traces  
logui --demo livestream     # Real-time streaming logs
logui --demo corrupted      # Edge cases and malformed logs
```

## 🎬 Demo Options

LogUI includes several demo modes to showcase different log scenarios:

```bash
# Basic demo with typical application logs
logui --demo basic

# Large file performance test (10MB+ of logs)
logui --demo bigfile

# Stack traces and multiline error logs  
logui --demo stack-traces

# Real-time streaming logs (generates continuously)
logui --demo livestream

# Corrupted/malformed logs and edge cases
logui --demo corrupted
```

You can also generate sample logs without starting the server:

```bash
# Generate logs for testing
logui --generate bigfile
logui --generate stack-traces
logui --generate livestream
```

## 🛠️ Development

For local development:

```bash
# Clone the repository  
git clone https://github.com/ajaymerchia/log-ui.git
cd log-ui
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📋 Log Format Support

LogUI automatically detects and parses various log formats:

- **Plain text logs** with automatic level detection
- **JSON logs** with structured field extraction
- **Timestamped logs** (ISO 8601, syslog, custom formats)
- **Tagged logs** with `[SERVICE]` or `[COMPONENT]` patterns

### Example Log Formats

```bash
# Plain text with timestamp and level
2023-12-15T15:24:31.542Z [ERROR] [API] Database connection failed

# JSON structured logs
{"timestamp":"2023-12-15T15:24:31.542Z","level":"ERROR","service":"API","message":"Database timeout"}

# Syslog format
Dec 15 15:24:31 server01 nginx[1234]: [error] connection refused
```

## ⌨️ Keyboard Shortcuts

- `⌘K` / `Ctrl+K` - Open command palette
- `Space` - Pause/Resume log streaming
- `Escape` - Clear current selection/filters
- `↑/↓` - Navigate through log entries
- `⌘F` / `Ctrl+F` - Focus search bar

## 🎨 Customization

LogUI uses a beautiful dark theme by default, inspired by Linear and Stripe:

- **Primary**: `#5E6AD2` (Purple-blue)
- **Success**: `#00D26A` (Green)
- **Warning**: `#FF991F` (Orange)
- **Error**: `#F5455C` (Red)

## 📦 API

### CLI Options

```bash
logui [file] [options]

Options:
  -p, --port <port>              Server port (default: 3001)
  --no-open                      Don't open browser automatically
  --demo [type]                  Run demo mode (basic|bigfile|stack-traces|corrupted|livestream)
  --generate <type>              Generate sample logs (basic|bigfile|stack-traces|corrupted|livestream)
  --tail <file>                  Tail a specific log file
  -h, --help                     Display help information
  -V, --version                  Display version number

Examples:
  logui app.log                  # Tail app.log
  logui --demo                   # Run basic demo
  logui --demo livestream        # Live streaming demo
  logui --generate bigfile       # Generate 10MB test file
  logui --port 8080 app.log      # Use custom port
```

## 🔧 Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Socket.IO
- **Build**: Vite, TypeScript compiler
- **State**: Zustand for client state management
- **File Watching**: Chokidar for cross-platform file monitoring

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
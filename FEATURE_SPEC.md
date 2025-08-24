# LogUI - Beautiful Log Tailing Interface
## Feature Specification

Based on research of modern observability platforms like Datadog, Honeycomb, and current UI trends, here's a comprehensive feature spec:

## 🎯 Core Vision
A lightweight, beautiful local web server for real-time log tailing that feels as polished as Linear or Stripe's interfaces, with the power of enterprise observability tools.

## 📋 Feature Specification

### 🔧 Core Features

#### **1. Real-time Log Streaming**
- WebSocket-based live tail functionality
- Configurable buffer size and retention
- Pause/resume streaming
- Auto-scroll with manual override
- Performance optimizations for high-volume logs

#### **2. Smart Log Parsing**
- Auto-detect common log formats (JSON, structured, plain text)
- Extract log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Parse timestamps with timezone support
- Extract tags from `[tag]` patterns at line start
- Custom regex patterns for field extraction

#### **3. Beautiful Timeline View**
- Horizontal timeline scrubber (like Linear's issue timeline)
- Zoom in/out on time ranges
- Jump to specific timestamps
- Visual density indicators
- Smooth animations and transitions

#### **4. Advanced Filtering & Search**
- **Faceted Filtering:**
  - Log levels with color-coded badges
  - Tags with auto-completion
  - Time range picker
  - Source files/services
- **Search:**
  - Full-text search with highlighting
  - Regex support
  - Search history
  - Saved search queries
- **Quick Filters:**
  - One-click common filters (errors only, last 5min, etc.)

#### **5. Modern UI Components**
- **Command Palette** (⌘K) - Stripe-style quick actions
- **Sidebar Navigation** - collapsible file browser
- **Log Entry Cards** - clean, scannable format
- **Status Bar** - connection status, log count, filters active
- **Toast Notifications** - for alerts and status updates

### 🎨 Design System

#### **Visual Hierarchy**
```
Priority Levels:
1. ERROR logs - Red accent, bold
2. WARN logs - Amber accent  
3. Current search matches - Blue highlight
4. INFO logs - Default styling
5. DEBUG/TRACE - Muted styling
```

#### **Color Palette** (inspired by Linear)
- Primary: `#5E6AD2` (purple-blue)
- Success: `#00D26A` 
- Warning: `#FF991F`
- Error: `#F5455C`
- Surface: `#0D1117` (dark) / `#FFFFFF` (light)
- Muted: `#656D76`

#### **Typography**
- Headers: SF Pro Display / Inter (bold, clean)
- Body: SF Mono / Fira Code (logs)
- Sizes: Responsive scale (12px - 24px)

### 🛠 Technical Architecture

#### **Frontend Stack**
- **React 18** with TypeScript
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **React Query** for server state management
- **Zustand** for client state
- **Radix UI** for accessible primitives

#### **Backend Stack**
- **Node.js** with Express
- **Socket.io** for real-time updates
- **Chokidar** for file watching
- **Node-tail** for efficient log reading

#### **Key Features Implementation**
- Virtual scrolling for performance
- Debounced search and filtering
- Efficient diff algorithms for updates
- Local storage for user preferences
- Service worker for offline functionality

### 📱 User Experience Flow

1. **Landing** - Drag & drop log files or browse
2. **Connection** - Real-time status with smooth loading states  
3. **Overview** - Timeline + facets sidebar + main log view
4. **Interaction** - Fluid filtering, searching, and navigation
5. **Details** - Click log entries for expanded context view

### 🚀 Advanced Features (Phase 2)
- Multiple file tailing simultaneously
- Log aggregation and correlation
- Export filtered logs
- Custom alerting rules
- Plugin system for custom parsers
- Performance metrics dashboard
- Keyboard shortcuts overlay

### 📦 Distribution
- Single npm package: `npx logui [file]`
- Automatic browser opening
- Zero-config setup
- Cross-platform compatibility

## 🗺 Implementation Plan

### Phase 1: Foundation
1. **Project Setup** - Create modern Node.js/React project with TypeScript
2. **Basic Backend** - Express server with file watching and WebSocket streaming
3. **Core UI** - React components with Tailwind, basic log display
4. **Log Parsing** - Smart detection of formats, levels, and tags

### Phase 2: Polish & Features  
5. **Timeline Component** - Beautiful time-based navigation
6. **Advanced Filtering** - Faceted search with tags and log levels
7. **Command Palette** - ⌘K quick actions and search
8. **Performance** - Virtual scrolling and optimization

### Phase 3: Distribution
9. **NPM Package** - CLI tool with `npx logui` command
10. **Documentation** - README and usage examples

**Tech Stack:** React 18 + TypeScript, Node.js + Express + Socket.io, Tailwind CSS + Framer Motion
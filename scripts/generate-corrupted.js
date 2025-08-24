#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { generateLogEntry } = require('../generate-logs.js')

// Create a temp directory for demo files when installed globally
const isGlobalInstall = __dirname.includes('node_modules')
const outputDir = isGlobalInstall ? 
  path.join(require('os').tmpdir(), 'logui-demos') : 
  path.join(__dirname, '../samples')

const outputFile = path.join(outputDir, 'corrupted-demo.log')

console.log(`🚀 Generating corrupted log demo...`)
console.log(`📁 Output: ${outputFile}`)

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const corruptedLogs = [
  // Normal logs first
  generateLogEntry(),
  generateLogEntry(),
  
  // Incomplete timestamp
  '2023-12-15T15:2[ERROR] [API] Malformed timestamp',
  
  // Missing closing bracket
  '2023-12-15T15:24:31.542Z [ERROR [API] Missing bracket',
  
  // Binary data mixed in
  '2023-12-15T15:24:31.542Z [INFO] [SERVER] Binary data: \x00\x01\xFF\xFE',
  
  // Very long line that might break parsing
  '2023-12-15T15:24:31.542Z [DEBUG] [PERF] ' + 'A'.repeat(5000),
  
  // Empty lines and whitespace
  '',
  '   ',
  '\t\t\t',
  
  // Line with only timestamp
  '2023-12-15T15:24:31.542Z',
  
  // Line with invalid JSON in message
  '2023-12-15T15:24:31.542Z [INFO] [API] Received data: {"invalid": json, "missing": quotes}',
  
  // Unicode characters
  '2023-12-15T15:24:31.542Z [INFO] [I18N] Processing message: 🚀 ñoño café',
  
  generateLogEntry(),
  
  // Line that's cut off mid-way
  '2023-12-15T15:24:31.542Z [ERROR] [DB] Connection failed due to',
  
  // Multiple spaces and tabs
  '2023-12-15T15:24:31.542Z    [WARN]     [CACHE]        Key not found',
  
  generateLogEntry(),
  generateLogEntry(),
]

fs.writeFileSync(outputFile, corruptedLogs.join('\n'))

console.log(`✅ Generated corrupted log demo with ${corruptedLogs.length} lines`)
console.log(`📄 Contains various parsing edge cases and malformed entries`)
console.log(`📄 File: ${outputFile}`)
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { generateLogEntry } = require('../generate-logs.js')

const outputFile = path.join(__dirname, '../samples/livestream-demo.log')
const INTERVAL_MS = 1000 // Generate a log every second

console.log(`🚀 Starting livestream log generator...`)
console.log(`📁 Output: ${outputFile}`)
console.log(`⏱️  Generating logs every ${INTERVAL_MS}ms`)
console.log(`🛑 Press Ctrl+C to stop\n`)

// Clear the file
fs.writeFileSync(outputFile, '')

let logCount = 0

function generateLog() {
  const logEntry = generateLogEntry()
  fs.appendFileSync(outputFile, logEntry + '\n')
  logCount++
  
  // Color code the output
  const level = logEntry.match(/\[(\w+)\]/)?.[1]
  let color = '\x1b[37m' // white
  
  switch (level) {
    case 'ERROR': color = '\x1b[31m'; break // red
    case 'WARN': color = '\x1b[33m'; break  // yellow
    case 'INFO': color = '\x1b[32m'; break  // green
    case 'DEBUG': color = '\x1b[36m'; break // cyan
  }
  
  console.log(color + `[${logCount}] ` + logEntry + '\x1b[0m')
  
  setTimeout(generateLog, INTERVAL_MS)
}

// Start generating
generateLog()

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping livestream generator...')
  console.log(`📁 Generated ${logCount} log entries in ${outputFile}`)
  process.exit(0)
})
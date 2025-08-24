#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { generateLogEntry } = require('../generate-logs.js')

const TARGET_SIZE_MB = 10
const ENTRIES_PER_MB = 1000
const TOTAL_ENTRIES = TARGET_SIZE_MB * ENTRIES_PER_MB

// Create a temp directory for demo files when installed globally
const isGlobalInstall = __dirname.includes('node_modules')
const outputDir = isGlobalInstall ? 
  path.join(require('os').tmpdir(), 'logui-demos') : 
  path.join(__dirname, '../samples')

const outputFile = path.join(outputDir, 'bigfile-demo.log')

console.log(`🚀 Generating ${TARGET_SIZE_MB}MB log file...`)
console.log(`📁 Output: ${outputFile}`)

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Clear the file
fs.writeFileSync(outputFile, '')

let entriesGenerated = 0
const batchSize = 1000

function generateBatch() {
  const entries = []
  const remaining = Math.min(batchSize, TOTAL_ENTRIES - entriesGenerated)
  
  for (let i = 0; i < remaining; i++) {
    entries.push(generateLogEntry())
  }
  
  fs.appendFileSync(outputFile, entries.join('\n') + '\n')
  entriesGenerated += remaining
  
  const progress = ((entriesGenerated / TOTAL_ENTRIES) * 100).toFixed(1)
  process.stdout.write(`\r📊 Progress: ${progress}% (${entriesGenerated}/${TOTAL_ENTRIES} entries)`)
  
  if (entriesGenerated < TOTAL_ENTRIES) {
    setImmediate(generateBatch)
  } else {
    const stats = fs.statSync(outputFile)
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2)
    console.log(`\n✅ Generated ${sizeInMB}MB log file with ${entriesGenerated} entries`)
    console.log(`📄 File: ${outputFile}`)
  }
}

generateBatch()
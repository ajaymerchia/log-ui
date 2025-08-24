#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { generateLogEntry } = require('../generate-logs.js')

const TARGET_SIZE_MB = 10
const ENTRIES_PER_MB = 1000
const TOTAL_ENTRIES = TARGET_SIZE_MB * ENTRIES_PER_MB

const outputFile = path.join(__dirname, '../samples/bigfile-demo.log')

console.log(`🚀 Generating ${TARGET_SIZE_MB}MB log file...`)
console.log(`📁 Output: ${outputFile}`)

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
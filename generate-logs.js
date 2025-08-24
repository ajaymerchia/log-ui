#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { Command } = require('commander')

const program = new Command()

program
  .name('generate-logs')
  .description('Generate realistic log entries for testing LogUI')
  .version('1.0.0')
  .option('-t, --target-file <path>', 'target file to write logs to', 'samples/livestream.log')
  .option('--no-clear', 'do not clear the target file before writing (append mode)')
  .option('-i, --interval <ms>', 'interval range for log generation (e.g., "500-2000")', '500-2000')
  .option('-b, --batch-size <size>', 'batch size range (e.g., "1-3")', '1-3')
  .parse()

const options = program.opts()

// Resolve target file path
let LOG_FILE
if (path.isAbsolute(options.targetFile)) {
  LOG_FILE = options.targetFile
} else if (options.targetFile.includes('/')) {
  LOG_FILE = path.resolve(options.targetFile)
} else {
  LOG_FILE = path.join(__dirname, 'samples', options.targetFile)
}
const SERVICES = ['API', 'AUTH', 'DB', 'CACHE', 'PAYMENT', 'METRICS', 'SECURITY', 'SERVER']
const LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG']
const IPS = ['192.168.1.100', '192.168.1.101', '10.0.0.15', '172.16.0.5']

const MESSAGES = {
  INFO: [
    'User login successful: user_id={userId}, session={sessionId}',
    'Health check passed - all systems operational',
    'Server started successfully on port 3000',
    'New request received: {method} {endpoint}',
    'Processing payment for amount ${amount}',
    'Cache hit for key: {key}',
    'User {userId} updated profile successfully',
    'Email sent to user {email}',
    'Background job completed: {jobId}',
    'File uploaded: {filename} ({size}MB)'
  ],
  WARN: [
    'Rate limit exceeded for IP {ip} - throttling requests',
    'Slow query detected: {query} - execution time: {time}s',
    'Memory usage high: {memory}MB - consider scaling',
    'Failed login attempt from IP {ip} - user not found',
    'API timeout for external service: {service}',
    'Disk space running low: {percentage}% used',
    'SSL certificate expires in {days} days',
    'Unusual traffic pattern detected from {ip}'
  ],
  ERROR: [
    'Database connection failed: Connection timeout after 30 seconds',
    'Payment processing failed: card declined for amount ${amount}',
    'Authentication service unavailable',
    'File upload failed: {filename} - insufficient storage',
    'Email delivery failed to {email}: SMTP error',
    'External API call failed: {service} returned 500',
    'Database query failed: {query}',
    'SSL handshake failed for domain {domain}'
  ],
  DEBUG: [
    'Cache miss for key: {key} - fetching from database',
    'Memory usage: {memory}MB, CPU: {cpu}%, Disk: {disk}%',
    'Processing request {requestId} from {ip}',
    'Database connection pool: {active}/{total} connections',
    'Session cleanup: removed {count} expired sessions',
    'Background job queued: {jobType} with priority {priority}',
    'Loading configuration from {configFile}',
    'Initializing module: {module}'
  ]
}

const ENDPOINTS = ['/api/users', '/api/orders', '/api/auth/login', '/api/health', '/api/payments']
const METHODS = ['GET', 'POST', 'PUT', 'DELETE']

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateUserId() {
  return randomInt(10000, 99999)
}

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15)
}

function generateLogEntry() {
  const timestamp = new Date().toISOString()
  const level = randomChoice(LOG_LEVELS)
  const service = randomChoice(SERVICES)
  const messageTemplate = randomChoice(MESSAGES[level])
  
  // Replace placeholders with random data
  const message = messageTemplate
    .replace('{userId}', generateUserId())
    .replace('{sessionId}', generateSessionId())
    .replace('{ip}', randomChoice(IPS))
    .replace('{method}', randomChoice(METHODS))
    .replace('{endpoint}', randomChoice(ENDPOINTS))
    .replace('{amount}', (Math.random() * 1000).toFixed(2))
    .replace('{time}', (Math.random() * 5 + 0.1).toFixed(1))
    .replace('{memory}', randomInt(200, 800))
    .replace('{cpu}', randomInt(5, 95))
    .replace('{disk}', randomInt(20, 90))
    .replace('{key}', `user_session_${Math.random().toString(36).substring(2, 10)}`)
    .replace('{email}', `user${randomInt(1, 1000)}@example.com`)
    .replace('{jobId}', `job_${Math.random().toString(36).substring(2, 10)}`)
    .replace('{filename}', `document_${randomInt(1, 100)}.pdf`)
    .replace('{size}', (Math.random() * 10).toFixed(1))
    .replace('{service}', randomChoice(['stripe', 'sendgrid', 'aws-s3', 'redis']))
    .replace('{percentage}', randomInt(75, 95))
    .replace('{days}', randomInt(1, 30))
    .replace('{query}', 'SELECT * FROM users WHERE active = true')
    .replace('{domain}', randomChoice(['api.example.com', 'app.example.com']))
    .replace('{requestId}', `req_${Math.random().toString(36).substring(2, 10)}`)
    .replace('{active}', randomInt(5, 50))
    .replace('{total}', randomInt(50, 100))
    .replace('{count}', randomInt(1, 20))
    .replace('{jobType}', randomChoice(['email', 'report', 'backup', 'cleanup']))
    .replace('{priority}', randomChoice(['high', 'medium', 'low']))
    .replace('{configFile}', randomChoice(['app.json', 'database.yml', '.env']))
    .replace('{module}', randomChoice(['auth', 'payments', 'notifications', 'analytics']))

  return `${timestamp} [${level}] [${service}] ${message}`
}

function startLogging() {
  // Parse interval and batch size ranges
  const [minInterval, maxInterval] = options.interval.split('-').map(Number)
  const [minBatch, maxBatch] = options.batchSize.split('-').map(Number)
  
  console.log(`🚀 Starting log generator...`)
  console.log(`📄 Writing logs to: ${LOG_FILE}`)
  console.log(`⏱️  Generating ${minBatch}-${maxBatch} logs every ${minInterval}-${maxInterval}ms`)
  console.log(`📝 Mode: ${options.clear ? 'overwrite' : 'append'}`)
  console.log(`🛑 Press Ctrl+C to stop\n`)

  // Ensure the directory exists
  const logDir = path.dirname(LOG_FILE)
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  // Clear the log file only if --no-clear wasn't specified
  if (options.clear) {
    fs.writeFileSync(LOG_FILE, '')
    console.log(`🗑️  Cleared existing log file\n`)
  } else {
    console.log(`➕ Appending to existing log file\n`)
  }

  const generateBatch = () => {
    const batchSize = randomInt(minBatch, maxBatch)
    const entries = []
    
    for (let i = 0; i < batchSize; i++) {
      entries.push(generateLogEntry())
    }
    
    const logData = entries.join('\n') + '\n'
    fs.appendFileSync(LOG_FILE, logData)
    
    // Print to console with colors
    entries.forEach(entry => {
      const level = entry.match(/\[(\w+)\]/)?.[1]
      let color = '\x1b[37m' // white
      
      switch (level) {
        case 'ERROR': color = '\x1b[31m'; break // red
        case 'WARN': color = '\x1b[33m'; break  // yellow
        case 'INFO': color = '\x1b[32m'; break  // green
        case 'DEBUG': color = '\x1b[36m'; break // cyan
      }
      
      console.log(color + entry + '\x1b[0m')
    })
    
    // Schedule next batch
    const delay = randomInt(minInterval, maxInterval)
    setTimeout(generateBatch, delay)
  }

  // Start generating
  generateBatch()
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping log generator...')
  console.log(`📁 Log file saved: ${LOG_FILE}`)
  process.exit(0)
})

if (require.main === module) {
  startLogging()
}

module.exports = { generateLogEntry, LOG_FILE }
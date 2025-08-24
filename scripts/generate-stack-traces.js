#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const outputFile = path.join(__dirname, '../samples/stack-traces-demo.log')

const STACK_TRACES = [
  {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    service: 'API',
    message: 'Unhandled exception in user controller',
    stack: [
      '    at UserController.getUser (/app/src/controllers/user.js:45:12)',
      '    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)',
      '    at next (/app/node_modules/express/lib/router/route.js:137:13)',
      '    at Route.dispatch (/app/node_modules/express/lib/router/route.js:112:3)',
      '    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)',
      '    at /app/node_modules/express/lib/router/index.js:281:22'
    ]
  },
  {
    timestamp: new Date(Date.now() - 5000).toISOString(),
    level: 'ERROR',
    service: 'DB',
    message: 'Database connection pool exhausted',
    stack: [
      'Error: Connection pool exhausted',
      '    at Pool.acquire (/app/node_modules/mysql2/lib/pool.js:45:23)',
      '    at Database.query (/app/src/database/connection.js:78:15)',
      '    at UserService.findById (/app/src/services/user.js:32:18)',
      '    at UserController.getUser (/app/src/controllers/user.js:28:25)'
    ]
  },
  {
    timestamp: new Date(Date.now() - 10000).toISOString(),
    level: 'ERROR',
    service: 'PAYMENT',
    message: 'Payment gateway timeout',
    stack: [
      'TimeoutError: Request timeout after 30000ms',
      '    at Timeout._onTimeout (/app/node_modules/axios/lib/adapters/http.js:178:16)',
      '    at listOnTimeout (internal/timers.js:554:17)',
      '    at processTimers (internal/timers.js:497:7)',
      '    at PaymentService.processPayment (/app/src/services/payment.js:156:12)',
      '    at PaymentController.createPayment (/app/src/controllers/payment.js:89:24)'
    ]
  }
]

console.log(`🚀 Generating stack trace demo logs...`)
console.log(`📁 Output: ${outputFile}`)

const logEntries = []

STACK_TRACES.forEach(entry => {
  const logLine = `${entry.timestamp} [${entry.level}] [${entry.service}] ${entry.message}`
  logEntries.push(logLine)
  entry.stack.forEach(stackLine => {
    logEntries.push(stackLine)
  })
  logEntries.push('') // Empty line after each stack trace
})

// Add some normal logs between stack traces
const normalLogs = [
  `${new Date(Date.now() - 15000).toISOString()} [INFO] [SERVER] Server started successfully on port 3000`,
  `${new Date(Date.now() - 12000).toISOString()} [INFO] [AUTH] User login successful: user_id=12345`,
  `${new Date(Date.now() - 8000).toISOString()} [WARN] [CACHE] Cache miss for key: user_session_abc123`,
  `${new Date(Date.now() - 3000).toISOString()} [INFO] [API] Health check passed - all systems operational`
]

// Interleave normal logs
const finalEntries = [...normalLogs.slice(0, 2), ...logEntries.slice(0, 5), normalLogs[2], ...logEntries.slice(5, 10), normalLogs[3], ...logEntries.slice(10)]

fs.writeFileSync(outputFile, finalEntries.join('\n'))

console.log(`✅ Generated stack trace demo with ${finalEntries.length} lines`)
console.log(`📄 File: ${outputFile}`)
import { LogEntry, LogLevel } from './types'

export class LogParser {
  private static readonly LOG_LEVELS: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
  
  parseLine(line: string, source?: string): LogEntry | null {
    try {
      if (!line.trim()) {
        console.log(`[PARSER] Empty line received from ${source}, skipping`)
        return null
      }

      console.log(`[PARSER] Parsing line from ${source}: ${line.substring(0, 100)}...`)

      const entry: LogEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        level: 'INFO',
        message: line,
        tags: [],
        source
      }

      // Try to extract timestamp
      const timestampMatch = this.extractTimestamp(line)
      if (timestampMatch) {
        console.log(`[PARSER] Extracted timestamp: ${timestampMatch.timestamp.toISOString()}`)
        entry.timestamp = timestampMatch.timestamp
        entry.message = timestampMatch.remainingLine
      } else {
        console.log(`[PARSER] No timestamp pattern matched, using current time`)
      }

      // Extract log level
      const levelMatch = this.extractLogLevel(entry.message)
      if (levelMatch) {
        console.log(`[PARSER] Extracted log level: ${levelMatch.level}`)
        entry.level = levelMatch.level
        entry.message = levelMatch.remainingLine
      } else {
        console.log(`[PARSER] No log level pattern matched, using default INFO`)
      }

      // Extract tags from [tag] patterns
      const tagMatch = this.extractTags(entry.message)
      if (tagMatch) {
        console.log(`[PARSER] Extracted tags: ${tagMatch.tags.join(', ')}`)
        entry.tags = tagMatch.tags
        entry.message = tagMatch.remainingLine
      } else {
        console.log(`[PARSER] No tags extracted`)
      }

      // Try to parse as JSON
      const jsonData = this.tryParseJson(line)
      if (jsonData) {
        console.log(`[PARSER] JSON pattern detected, using JSON parser`)
        return this.parseJsonLog(jsonData, source)
      }

      console.log(`[PARSER] Successfully parsed line from ${source}: ${entry.level} - ${entry.message.substring(0, 50)}...`)
      return entry
    } catch (error) {
      console.error(`[PARSER] Error parsing log line from ${source}:`, error, 'Line:', line)
      // Return a basic entry instead of failing completely
      return {
        id: this.generateId(),
        timestamp: new Date(),
        level: 'INFO',
        message: line,
        tags: [],
        source
      }
    }
  }

  private extractTimestamp(line: string): { timestamp: Date; remainingLine: string } | null {
    const patterns = [
      // Bracketed ISO 8601: [2025-08-24T06:38:36.757Z] (common in structured logs)
      /^\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\]\s*/,
      // ISO 8601: 2023-12-15T15:24:31.542Z
      /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\s*/,
      // Common log format: 2023-12-15 15:24:31.542
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s*/,
      // Time only: 15:24:31.542
      /^(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s*/,
      // Syslog format: Dec 15 15:24:31
      /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s*/,
    ]

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        const timestampStr = match[1]
        let timestamp: Date

        try {
          // Handle time-only format by adding today's date
          if (pattern === patterns[4]) { // Updated index for time-only pattern
            const today = new Date().toISOString().split('T')[0]
            timestamp = new Date(`${today}T${timestampStr}`)
          } else if (pattern === patterns[5]) { // Updated index for syslog format
            // Handle syslog format
            const year = new Date().getFullYear()
            timestamp = new Date(`${timestampStr} ${year}`)
          } else {
            timestamp = new Date(timestampStr)
          }

          if (!isNaN(timestamp.getTime())) {
            return {
              timestamp,
              remainingLine: line.substring(match[0].length)
            }
          }
        } catch {
          // Continue to next pattern
        }
      }
    }

    return null
  }

  private extractLogLevel(line: string): { level: LogLevel; remainingLine: string } | null {
    const pattern = /^\[?(\w+)\]?\s*/
    const match = line.match(pattern)
    
    if (match) {
      const levelCandidate = match[1].toUpperCase()
      if (LogParser.LOG_LEVELS.includes(levelCandidate as LogLevel)) {
        return {
          level: levelCandidate as LogLevel,
          remainingLine: line.substring(match[0].length)
        }
      }
    }

    // Check for common level indicators in the message
    for (const level of LogParser.LOG_LEVELS) {
      const regex = new RegExp(`\\b${level.toLowerCase()}\\b|\\b${level}\\b`, 'i')
      if (regex.test(line)) {
        return { level, remainingLine: line }
      }
    }

    return null
  }

  private extractTags(line: string): { tags: string[]; remainingLine: string } | null {
    const tags: string[] = []
    let remainingLine = line
    const tagPattern = /^\[([^\]]+)\]\s*/

    let match
    while ((match = remainingLine.match(tagPattern))) {
      tags.push(match[1])
      remainingLine = remainingLine.substring(match[0].length)
    }

    return tags.length > 0 ? { tags, remainingLine } : null
  }

  private tryParseJson(line: string): any | null {
    try {
      // Try to parse the entire line as JSON
      return JSON.parse(line.trim())
    } catch {
      // Try to find JSON within the line
      const jsonMatch = line.match(/\{.*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          return null
        }
      }
      return null
    }
  }

  private parseJsonLog(data: any, source?: string): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'INFO',
      message: '',
      tags: [],
      source,
      metadata: data
    }

    // Extract common fields
    if (data.timestamp || data.time || data['@timestamp']) {
      const ts = data.timestamp || data.time || data['@timestamp']
      entry.timestamp = new Date(ts)
    }

    if (data.level || data.severity || data.priority) {
      const level = (data.level || data.severity || data.priority).toString().toUpperCase()
      if (LogParser.LOG_LEVELS.includes(level as LogLevel)) {
        entry.level = level as LogLevel
      }
    }

    if (data.message || data.msg || data.text) {
      entry.message = data.message || data.msg || data.text
    } else {
      // Fallback to stringified JSON
      entry.message = JSON.stringify(data)
    }

    // Extract tags from various fields
    const tagSources = [data.tags, data.labels, data.component, data.service, data.module]
    for (const tagSource of tagSources) {
      if (Array.isArray(tagSource)) {
        entry.tags.push(...tagSource)
      } else if (typeof tagSource === 'string') {
        entry.tags.push(tagSource)
      }
    }

    return entry
  }

  // Check if a line starts a new log entry (has timestamp or log level at the beginning)
  isNewLogEntry(line: string): boolean {
    if (!line.trim()) return false
    
    console.log(`[PARSER] Checking if line is new entry: "${line.substring(0, 80)}..."`)
    
    // Check for timestamp patterns at the beginning of the line
    const timestampPatterns = [
      // Bracketed ISO 8601: [2025-08-24T06:38:36.757Z]
      /^\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\]/,
      // ISO 8601: 2023-12-15T15:24:31.542Z
      /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/,
      // Common log format: 2023-12-15 15:24:31.542
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/,
      // Time only: 15:24:31.542
      /^(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/,
      // Syslog format: Dec 15 15:24:31
      /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,
    ]
    
    // If line starts with timestamp, it's definitely a new entry
    for (const pattern of timestampPatterns) {
      if (pattern.test(line)) {
        console.log(`[PARSER] Line matches timestamp pattern: true`)
        return true
      }
    }
    
    // If line starts with log level in brackets, it's likely a new entry
    const levelPattern = /^\[?(\w+)\]?\s+/
    const match = line.match(levelPattern)
    if (match) {
      const levelCandidate = match[1].toUpperCase()
      if (LogParser.LOG_LEVELS.includes(levelCandidate as LogLevel)) {
        console.log(`[PARSER] Line matches level pattern: true (${levelCandidate})`)
        return true
      }
    }
    
    // If line starts with common patterns indicating a new entry
    if (/^(INFO|WARN|ERROR|DEBUG|TRACE)\b/i.test(line)) {
      console.log(`[PARSER] Line matches log level pattern: true`)
      return true
    }
    
    console.log(`[PARSER] Line is continuation: false`)
    return false
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}
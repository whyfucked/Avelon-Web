/**
 * Local JSON Database for VMManager6 rentals
 * Simple file-based storage for rental records
 */

import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'vmmanager6-db.json')

export interface LocalDatabase {
  vmmanager6_rentals?: any[]
  [key: string]: any
}

function ensureDbExists(): void {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ vmmanager6_rentals: [] }, null, 2))
  }
}

export function readDatabase(): LocalDatabase {
  try {
    ensureDbExists()
    const data = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('[LocalDB] Error reading database:', error)
    return { vmmanager6_rentals: [] }
  }
}

export function writeDatabase(data: LocalDatabase): void {
  try {
    ensureDbExists()
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('[LocalDB] Error writing database:', error)
    throw error
  }
}

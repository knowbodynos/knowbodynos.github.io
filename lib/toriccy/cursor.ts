// lib/toriccy/cursor.ts
import 'server-only'
import { ObjectId } from 'mongodb'

type CursorPayload = { id: string }

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): CursorPayload {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8')
  const parsed = JSON.parse(raw)
  if (!parsed?.id) throw new Error('Invalid cursor')
  return { id: String(parsed.id) }
}

// For global POLY paging only (by _id)
export function buildCursorMatch(sortDir: 'asc' | 'desc', cursor: string) {
  const { id } = decodeCursor(cursor)
  const oid = new ObjectId(id)
  return sortDir === 'asc' ? { _id: { $gt: oid } } : { _id: { $lt: oid } }
}

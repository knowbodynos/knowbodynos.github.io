// lib/toriccy/match.ts
import 'server-only'

import type { Document } from 'mongodb'
import { ALLOWLIST, type Level } from './allowlist'

type Operator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'
type Condition = { field: string; op: Operator; value: string }

function parseScalar(s: string): string | number | boolean {
  const t = (s ?? '').trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t !== '' && !Number.isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return t
}

export function buildMatch(level: Level, conditions: Condition[]): Document {
  const conf = ALLOWLIST[level]

  // conf.filterable’s precise TS type often depends on how you declared allowlist;
  // we treat it as an unknown map and validate at runtime.
  const filterable = conf.filterable as unknown as Record<string, readonly Operator[]>

  const out: Document = {}

  for (const c of conditions ?? []) {
    const allowedOps = filterable[c.field]
    if (!allowedOps) throw new Error(`Field not filterable: ${level}.${c.field}`)
    if (!allowedOps.includes(c.op))
      throw new Error(`Operator not allowed: ${level}.${c.field} ${c.op}`)

    const v = c.value ?? ''

    switch (c.op) {
      case 'eq':
        out[c.field] = parseScalar(v)
        break
      case 'ne':
        out[c.field] = { $ne: parseScalar(v) }
        break
      case 'gt':
        out[c.field] = { $gt: parseScalar(v) }
        break
      case 'gte':
        out[c.field] = { $gte: parseScalar(v) }
        break
      case 'lt':
        out[c.field] = { $lt: parseScalar(v) }
        break
      case 'lte':
        out[c.field] = { $lte: parseScalar(v) }
        break
      case 'contains':
        out[c.field] = { $regex: String(v), $options: 'i' }
        break
      case 'in': {
        const parts = String(v)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
          .map(parseScalar)
        out[c.field] = { $in: parts }
        break
      }
    }
  }

  return out
}

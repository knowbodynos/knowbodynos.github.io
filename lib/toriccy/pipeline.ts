// lib/toriccy/pipeline.ts
import 'server-only'

import type { Document } from 'mongodb'
import { ALLOWLIST } from './allowlist'
import { buildMatch } from './match'
import { buildCursorMatch } from './cursor'

type Level = 'POLY' | 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'
type Join = 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'
type SortDir = 'asc' | 'desc'

type Condition = {
  field: string
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'
  value: string
}

function requiredJoinsForLevel(resultLevel: Level): Join[] {
  switch (resultLevel) {
    case 'POLY':
      return []
    case 'GEOM':
      return ['GEOM']
    case 'TRIANG':
      return ['GEOM', 'TRIANG']
    case 'INVOL':
      return ['GEOM', 'TRIANG', 'INVOL']
    case 'SWISSCHEESE':
      return ['GEOM', 'SWISSCHEESE']
  }
}

function validateColumnsOrThrow(level: keyof typeof ALLOWLIST, cols: string[]) {
  const allowed = ALLOWLIST[level].columns as readonly string[]
  for (const c of cols)
    if (!allowed.includes(c)) throw new Error(`Column not allowed: ${level}.${c}`)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

// Safe join sort fields (indexed-friendly defaults)
const JOIN_SORT_FIELDS: Record<Join, readonly string[]> = {
  GEOM: ['GEOMN', 'H11', 'NTRIANGS'],
  TRIANG: ['TRIANGN', 'H11', 'NINVOL'],
  INVOL: ['INVOLN', 'H11', 'H21+', 'H21-', 'VOLFORMPARITY'],
  SWISSCHEESE: ['GEOMN', 'H11'],
} as const

function validateJoinSort(join: Join, field: string) {
  if (!JOIN_SORT_FIELDS[join].includes(field)) {
    throw new Error(`Join sort field not allowed: ${join}.${field}`)
  }
}

// Prefer unprefixed names; suffix only when collisions happen
function disambiguateName(
  used: Set<string>,
  name: string,
  source: 'BASE' | 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'
) {
  if (!used.has(name)) return name

  // If collision, suffix with source (only when needed)
  const candidate = `${name}__${source}`
  if (!used.has(candidate)) return candidate

  // Extremely unlikely (same field chosen twice from same source), but safe fallback
  let i = 2
  while (used.has(`${candidate}_${i}`)) i++
  return `${candidate}_${i}`
}

export function buildSafePipelineWithColumns(input: {
  baseCollection: 'POLY'
  base: { columns: string[]; conditions: Condition[] }

  resultLevel: Level
  joins: Join[]

  joinColumns: { GEOM: string[]; TRIANG: string[]; INVOL: string[]; SWISSCHEESE: string[] }
  joinConditions: {
    GEOM: Condition[]
    TRIANG: Condition[]
    INVOL: Condition[]
    SWISSCHEESE: Condition[]
  }

  joinSort: {
    GEOM: { field: string; direction: SortDir }
    TRIANG: { field: string; direction: SortDir }
    INVOL: { field: string; direction: SortDir }
    SWISSCHEESE: { field: string; direction: SortDir }
  }

  paging: {
    poly: { pageSize: number }
    geom: { pageSize: number }
    triang: { pageSize: number }
    invol: { pageSize: number }
    swiss: { pageSize: number }
  }

  sortField: string
  sortDir: SortDir

  cursor: string | null
}): { pipeline: Document[]; columns: string[] } {
  const {
    base,
    resultLevel,
    joins,
    joinColumns,
    joinConditions,
    joinSort,
    paging,
    sortField,
    sortDir,
    cursor,
  } = input

  // ✅ base.columns can be empty
  validateColumnsOrThrow('POLY', base.columns)
  validateColumnsOrThrow('GEOM', joinColumns.GEOM ?? [])
  validateColumnsOrThrow('TRIANG', joinColumns.TRIANG ?? [])
  validateColumnsOrThrow('INVOL', joinColumns.INVOL ?? [])
  validateColumnsOrThrow('SWISSCHEESE', joinColumns.SWISSCHEESE ?? [])

  if (!(ALLOWLIST.POLY.sortFields as readonly string[]).includes(sortField)) {
    throw new Error(`Sort field not allowed: POLY.${sortField}`)
  }

  validateJoinSort('GEOM', joinSort?.GEOM?.field ?? 'GEOMN')
  validateJoinSort('TRIANG', joinSort?.TRIANG?.field ?? 'TRIANGN')
  validateJoinSort('INVOL', joinSort?.INVOL?.field ?? 'INVOLN')
  validateJoinSort('SWISSCHEESE', joinSort?.SWISSCHEESE?.field ?? 'GEOMN')

  const polyDir = sortDir === 'asc' ? 1 : -1

  const polyPageSize = clamp(paging.poly.pageSize ?? 25, 1, 200)
  const geomPageSize = clamp(paging.geom.pageSize ?? 25, 1, 200)
  const triangPageSize = clamp(paging.triang.pageSize ?? 25, 1, 200)
  const involPageSize = clamp(paging.invol.pageSize ?? 25, 1, 200)
  const swissPageSize = clamp(paging.swiss.pageSize ?? 25, 1, 200)

  const pipeline: Document[] = []

  // ─────────────────────────────────────────────────────────────
  // Stage 1: POLY match + cursor + sort + limit EARLY
  // ─────────────────────────────────────────────────────────────
  const baseMatch = buildMatch('POLY', base.conditions)
  if (Object.keys(baseMatch).length > 0) pipeline.push({ $match: baseMatch })

  if (cursor) pipeline.push({ $match: buildCursorMatch(sortDir, cursor) })

  pipeline.push({ $sort: { [sortField]: polyDir, _id: polyDir } })

  // Fetch +1 POLY docs for hasNext calculation
  pipeline.push({ $limit: polyPageSize + 1 })

  // Keep join keys internally, but do NOT force them into final output
  const internalPolyKeep = new Set<string>(['_id', 'POLYID', sortField, ...base.columns])
  pipeline.push({
    $project: Object.fromEntries(Array.from(internalPolyKeep).map((k) => [k, 1])),
  })

  // Determine join set
  const joinSet = new Set<Join>([...joins, ...requiredJoinsForLevel(resultLevel)])
  const dirNum = (d: SortDir) => (d === 'asc' ? 1 : -1)

  // ─────────────────────────────────────────────────────────────
  // GEOM lookup (limited per POLY)
  // ─────────────────────────────────────────────────────────────
  if (joinSet.has('GEOM')) {
    const geomCond = buildMatch('GEOM', joinConditions?.GEOM ?? [])

    const geomProj: Record<string, 1> = { _id: 1, POLYID: 1, GEOMN: 1, H11: 1 }
    for (const f of joinColumns.GEOM ?? []) geomProj[f] = 1

    const geomSortField = joinSort?.GEOM?.field ?? 'GEOMN'
    const geomSortDir = dirNum(joinSort?.GEOM?.direction ?? 'asc')

    const geomPipeline: Document[] = [
      { $match: { $expr: { $eq: ['$POLYID', '$$polyid'] } } },
      ...(Object.keys(geomCond).length > 0 ? [{ $match: geomCond }] : []),
      { $sort: { [geomSortField]: geomSortDir, _id: geomSortDir } },
      { $limit: geomPageSize },
      { $project: geomProj },
    ]

    pipeline.push({
      $lookup: { from: 'GEOM', let: { polyid: '$POLYID' }, pipeline: geomPipeline, as: 'geom' },
    })

    if (
      resultLevel !== 'POLY' ||
      joinSet.has('TRIANG') ||
      joinSet.has('INVOL') ||
      joinSet.has('SWISSCHEESE')
    ) {
      pipeline.push({ $unwind: { path: '$geom', preserveNullAndEmptyArrays: true } })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TRIANG lookup (limited per (POLY,GEOM))
  // ─────────────────────────────────────────────────────────────
  if (joinSet.has('TRIANG')) {
    const triangCond = buildMatch('TRIANG', joinConditions?.TRIANG ?? [])

    const triangProj: Record<string, 1> = { _id: 1, POLYID: 1, GEOMN: 1, TRIANGN: 1, H11: 1 }
    for (const f of joinColumns.TRIANG ?? []) triangProj[f] = 1

    const triangSortField = joinSort?.TRIANG?.field ?? 'TRIANGN'
    const triangSortDir = dirNum(joinSort?.TRIANG?.direction ?? 'asc')

    const triangPipeline: Document[] = [
      {
        $match: {
          $expr: {
            $and: [{ $eq: ['$POLYID', '$$polyid'] }, { $eq: ['$GEOMN', '$$geomn'] }],
          },
        },
      },
      ...(Object.keys(triangCond).length > 0 ? [{ $match: triangCond }] : []),
      { $sort: { [triangSortField]: triangSortDir, _id: triangSortDir } },
      { $limit: triangPageSize },
      { $project: triangProj },
    ]

    pipeline.push({
      $lookup: {
        from: 'TRIANG',
        let: { polyid: '$POLYID', geomn: '$geom.GEOMN' },
        pipeline: triangPipeline,
        as: 'triang',
      },
    })

    if (resultLevel === 'TRIANG' || resultLevel === 'INVOL') {
      pipeline.push({ $unwind: { path: '$triang', preserveNullAndEmptyArrays: true } })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // INVOL lookup (limited per (POLY,GEOM,TRIANG))
  // ─────────────────────────────────────────────────────────────
  if (joinSet.has('INVOL')) {
    const involCond = buildMatch('INVOL', joinConditions?.INVOL ?? [])

    const involProj: Record<string, 1> = {
      _id: 1,
      POLYID: 1,
      GEOMN: 1,
      TRIANGN: 1,
      INVOLN: 1,
      H11: 1,
    }
    for (const f of joinColumns.INVOL ?? []) involProj[f] = 1

    const involSortField = joinSort?.INVOL?.field ?? 'INVOLN'
    const involSortDir = dirNum(joinSort?.INVOL?.direction ?? 'asc')

    const involPipeline: Document[] = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$POLYID', '$$polyid'] },
              { $eq: ['$GEOMN', '$$geomn'] },
              { $eq: ['$TRIANGN', '$$triangn'] },
            ],
          },
        },
      },
      ...(Object.keys(involCond).length > 0 ? [{ $match: involCond }] : []),
      { $sort: { [involSortField]: involSortDir, _id: involSortDir } },
      { $limit: involPageSize },
      { $project: involProj },
    ]

    pipeline.push({
      $lookup: {
        from: 'INVOL',
        let: { polyid: '$POLYID', geomn: '$geom.GEOMN', triangn: '$triang.TRIANGN' },
        pipeline: involPipeline,
        as: 'invol',
      },
    })

    if (resultLevel === 'INVOL') {
      pipeline.push({ $unwind: { path: '$invol', preserveNullAndEmptyArrays: true } })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SWISSCHEESE lookup (limited per (POLY,GEOM))
  // ─────────────────────────────────────────────────────────────
  if (joinSet.has('SWISSCHEESE')) {
    const swissCond = buildMatch('SWISSCHEESE', joinConditions?.SWISSCHEESE ?? [])

    const swissProj: Record<string, 1> = { _id: 1, POLYID: 1, GEOMN: 1, H11: 1 }
    for (const f of joinColumns.SWISSCHEESE ?? []) swissProj[f] = 1

    const swissSortField = joinSort?.SWISSCHEESE?.field ?? 'GEOMN'
    const swissSortDir = dirNum(joinSort?.SWISSCHEESE?.direction ?? 'asc')

    const swissPipeline: Document[] = [
      {
        $match: {
          $expr: {
            $and: [{ $eq: ['$POLYID', '$$polyid'] }, { $eq: ['$GEOMN', '$$geomn'] }],
          },
        },
      },
      ...(Object.keys(swissCond).length > 0 ? [{ $match: swissCond }] : []),
      { $sort: { [swissSortField]: swissSortDir, _id: swissSortDir } },
      { $limit: swissPageSize },
      { $project: swissProj },
    ]

    pipeline.push({
      $lookup: {
        from: 'SWISSCHEESE',
        let: { polyid: '$POLYID', geomn: '$geom.GEOMN' },
        pipeline: swissPipeline,
        as: 'swiss',
      },
    })

    if (resultLevel === 'SWISSCHEESE') {
      pipeline.push({ $unwind: { path: '$swiss', preserveNullAndEmptyArrays: true } })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Final flatten: no prefix unless needed
  // ─────────────────────────────────────────────────────────────
  const project: Record<string, Document | 1 | string> = {}
  const columnsOut: string[] = []
  const used = new Set<string>()

  // Keep _id always for cursor computation in route.ts (but don't add to columns)
  project['_id'] = 1

  // Base columns: unprefixed
  for (const f of base.columns ?? []) {
    const out = disambiguateName(used, f, 'BASE')
    used.add(out)
    project[out] = 1 // base doc field
    columnsOut.push(out)
  }

  // Join columns: unprefixed, suffix only on collision
  for (const f of joinColumns.GEOM ?? []) {
    const out = disambiguateName(used, f, 'GEOM')
    used.add(out)
    project[out] = `$geom.${f}`
    columnsOut.push(out)
  }
  for (const f of joinColumns.TRIANG ?? []) {
    const out = disambiguateName(used, f, 'TRIANG')
    used.add(out)
    project[out] = `$triang.${f}`
    columnsOut.push(out)
  }
  for (const f of joinColumns.INVOL ?? []) {
    const out = disambiguateName(used, f, 'INVOL')
    used.add(out)
    project[out] = `$invol.${f}`
    columnsOut.push(out)
  }
  for (const f of joinColumns.SWISSCHEESE ?? []) {
    const out = disambiguateName(used, f, 'SWISSCHEESE')
    used.add(out)
    project[out] = `$swiss.${f}`
    columnsOut.push(out)
  }

  pipeline.push({ $project: project })

  return { pipeline, columns: columnsOut }
}

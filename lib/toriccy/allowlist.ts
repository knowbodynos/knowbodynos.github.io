// lib/toriccy/allowlist.ts
import 'server-only'

export type Operator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'

const BASIC_OPS: readonly Operator[] = ['eq', 'ne', 'in', 'contains']
const NUM_OPS: readonly Operator[] = ['eq', 'ne', 'in', 'contains', 'gt', 'gte', 'lt', 'lte']

export const POLY_FIELDS = [
  'BASIS',
  'H21',
  'NVERTS',
  'DTOJ',
  'EULER',
  'DRESVERTS',
  'NNPOINTS',
  'POLYID',
  'FAV',
  'NDVERTS',
  'DVERTS',
  'FUNDGP',
  'H11',
  'CWS',
  'NNVERTS',
  'RESCWS',
  'NGEOMS',
  'NALLTRIANGS',
  'INVBASIS',
  'JTOD',
  'NDPOINTS',
  'POLYN',
] as const

export const GEOM_FIELDS = [
  'MORIMAT',
  'CHERN2XJ',
  'KAHLERMAT',
  'IPOLYXJ',
  'NTRIANGS',
  'POLYID',
  'CHERN2XNUMS',
  'H11',
  'GEOMN',
  'ITENSXJ',
] as const

export const TRIANG_FIELDS = [
  'CHERNAD',
  'TRIANG',
  'TRIANGN',
  'POLYID',
  'ALLTRIANGN',
  'CHERNAJ',
  'ITENSXD',
  'SRIDEAL',
  'CHERN3XD',
  'CHERN3XJ',
  'CHERN2XD',
  'H11',
  'GEOMN',
  'KAHLERMATP',
  'IPOLYAD',
  'MORIMATP',
  'IPOLYXD',
  'IPOLYAJ',
  'ITENSAD',
  'ITENSAJ',
  'DIVCOHOM',
  'NINVOL',
] as const

export const SWISS_FIELDS = ['GEOMN', 'POLYID', 'H11', 'EXPLICIT'] as const

export const INVOL_FIELDS = [
  'TRIANGN',
  'POLYID',
  'H11',
  'INVOL',
  'INVOLN',
  'GEOMN',
  'H21+',
  'H21-',
  'OPLANES',
  'NSYMCYTERMS',
  'H11+',
  'H11-',
  'NCYTERMS',
  'INVOLDIVCOHOM',
  'CYPOLY',
  'SYMCYPOLY',
  'SRINVOL',
  'ITENSXDINVOL',
  'CYSINGDIM',
  'SMOOTH',
  'VOLFORMPARITY',
] as const

function makeFilterable(fields: readonly string[], numericFields: readonly string[]) {
  const out: Record<string, readonly Operator[]> = {}
  const numeric = new Set(numericFields)
  for (const f of fields) out[f] = numeric.has(f) ? NUM_OPS : BASIC_OPS
  return out
}

export const ALLOWLIST = {
  POLY: {
    columns: POLY_FIELDS,
    filterable: makeFilterable(POLY_FIELDS, [
      'H11',
      'H21',
      'NGEOMS',
      'NALLTRIANGS',
      'NVERTS',
      'NNVERTS',
      'NDVERTS',
      'NNPOINTS',
      'NDPOINTS',
    ]),
    sortFields: ['POLYID', 'POLYN', 'H11', 'H21'] as const,
  },
  GEOM: {
    columns: GEOM_FIELDS,
    filterable: makeFilterable(GEOM_FIELDS, ['H11', 'NTRIANGS', 'GEOMN']),
  },
  TRIANG: {
    columns: TRIANG_FIELDS,
    filterable: makeFilterable(TRIANG_FIELDS, ['H11', 'NINVOL', 'TRIANGN', 'GEOMN']),
  },
  INVOL: {
    columns: INVOL_FIELDS,
    filterable: makeFilterable(INVOL_FIELDS, ['H11', 'INVOLN', 'TRIANGN', 'GEOMN']),
  },
  SWISSCHEESE: {
    columns: SWISS_FIELDS,
    filterable: makeFilterable(SWISS_FIELDS, ['H11', 'GEOMN']),
  },
} as const

export type Level = keyof typeof ALLOWLIST

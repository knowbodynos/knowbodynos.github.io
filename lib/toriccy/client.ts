// lib/toriccy/client.ts
import type { FormValues } from './uiSpec'
import type { Operator } from './uiConfig'

const API_URL = '/api/toriccy'

export type JoinedQueryResponse = {
  rows: Record<string, unknown>[]
  columns?: string[]
  hasNext: boolean
  nextCursor: string | null
}

type SortDir = 'asc' | 'desc'
type Level = 'POLY' | 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'
type Join = 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'
type Condition = { field: string; op: Operator; value: string }

export type ApiPayload = {
  baseCollection: 'POLY'
  base: {
    collection: 'POLY'
    columns: string[]
    conditions: Condition[]
  }

  resultLevel: Level

  joins: Join[]

  joinColumns: Record<Join, string[]>
  joinConditions: Record<Join, Condition[]>

  joinSort: Record<Join, { field: string; direction: SortDir }>

  paging: {
    poly: { pageSize: number }
    geom: { pageSize: number }
    triang: { pageSize: number }
    invol: { pageSize: number }
    swiss: { pageSize: number }
  }

  sort: { field: string; direction: SortDir }
  cursor: string | null
}

function normalizeConditions(v: unknown): Condition[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x): Condition | null => {
      if (!x || typeof x !== 'object') return null
      const obj = x as Record<string, unknown>
      if (typeof obj.field !== 'string') return null
      if (typeof obj.op !== 'string') return null
      if (typeof obj.value !== 'string') return null
      return { field: obj.field, op: obj.op as Operator, value: obj.value }
    })
    .filter((x): x is Condition => x !== null)
}

export function toApiPayload(values: FormValues, cursor: string | null): ApiPayload {
  const joinColumns: Record<Join, string[]> = {
    GEOM: values.joinColumns?.GEOM ?? [],
    TRIANG: values.joinColumns?.TRIANG ?? [],
    INVOL: values.joinColumns?.INVOL ?? [],
    SWISSCHEESE: values.joinColumns?.SWISSCHEESE ?? [],
  }

  const joinConditions: Record<Join, Condition[]> = {
    GEOM: normalizeConditions(values.joinConditions?.GEOM),
    TRIANG: normalizeConditions(values.joinConditions?.TRIANG),
    INVOL: normalizeConditions(values.joinConditions?.INVOL),
    SWISSCHEESE: normalizeConditions(values.joinConditions?.SWISSCHEESE),
  }

  const joinSort: Record<Join, { field: string; direction: SortDir }> = {
    GEOM: values.joinSort?.GEOM ?? { field: 'GEOMN', direction: 'asc' },
    TRIANG: values.joinSort?.TRIANG ?? { field: 'TRIANGN', direction: 'asc' },
    INVOL: values.joinSort?.INVOL ?? { field: 'INVOLN', direction: 'asc' },
    SWISSCHEESE: values.joinSort?.SWISSCHEESE ?? { field: 'GEOMN', direction: 'asc' },
  }

  const paging = values.paging ?? {
    poly: { pageSize: 25 },
    geom: { pageSize: 25 },
    triang: { pageSize: 25 },
    invol: { pageSize: 25 },
    swiss: { pageSize: 25 },
  }

  return {
    baseCollection: 'POLY',
    base: {
      collection: 'POLY',
      columns: values.baseColumns ?? [],
      conditions: normalizeConditions(values.baseConditions),
    },
    resultLevel: values.resultLevel,
    joins: values.joins,
    joinColumns,
    joinConditions,
    joinSort,
    paging,
    sort: values.sort,
    cursor,
  }
}

export async function postJoinedQuery(payload: ApiPayload): Promise<JoinedQueryResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const ct = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    if (ct.includes('application/json')) {
      const j: unknown = await res.json().catch(() => null)
      const msg =
        j &&
        typeof j === 'object' &&
        'error' in j &&
        typeof (j as Record<string, unknown>).error === 'string'
          ? String((j as Record<string, unknown>).error)
          : `Query failed (${res.status})`
      throw new Error(msg)
    }
    const text = await res.text().catch(() => '')
    throw new Error(text || `Query failed (${res.status})`)
  }

  return (await res.json()) as JoinedQueryResponse
}

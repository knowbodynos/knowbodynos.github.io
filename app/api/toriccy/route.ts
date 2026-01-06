// app/api/toriccy/route.ts
import 'server-only'

import { NextResponse } from 'next/server'
import { MongoClient, type Document } from 'mongodb'

import { JoinedQueryRequestSchema } from '@/lib/toriccy/spec'
import { buildSafePipelineWithColumns } from '@/lib/toriccy/pipeline'
import { encodeCursor } from '@/lib/toriccy/cursor'
import { rateLimitOrThrow } from '@/lib/toriccy/rateLimit'

function clientKey(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

declare global {
  var _queryMongoClientPromise: Promise<MongoClient> | undefined
}

async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri)
    throw Object.assign(new Error('Missing MONGODB_URI. Set it in .env.local.'), { status: 500 })

  if (!global._queryMongoClientPromise) {
    const client = new MongoClient(uri)
    global._queryMongoClientPromise = client.connect()
  }
  return global._queryMongoClientPromise
}

function isZodLikeError(x: unknown): x is { issues: unknown[] } {
  return (
    !!x &&
    typeof x === 'object' &&
    'issues' in x &&
    Array.isArray((x as Record<string, unknown>).issues)
  )
}

function getErrorMessage(x: unknown): string {
  if (x instanceof Error) return x.message
  if (typeof x === 'string') return x
  return 'Bad request'
}

function getErrorStatus(x: unknown): number {
  if (!x || typeof x !== 'object') return 400
  const s = (x as Record<string, unknown>).status
  return typeof s === 'number' ? s : 400
}

function getRetryAfterSec(x: unknown): number | null {
  if (!x || typeof x !== 'object') return null
  const r = (x as Record<string, unknown>).retryAfterSec
  return typeof r === 'number' ? r : null
}

export async function POST(req: Request) {
  try {
    rateLimitOrThrow(clientKey(req), { windowMs: 60_000, max: 30 })

    const dbName = process.env.MONGODB_DB
    if (!dbName) {
      return NextResponse.json(
        { error: 'Missing MONGODB_DB. Set it in .env.local.' },
        { status: 500 }
      )
    }

    const body: unknown = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const parsed = JoinedQueryRequestSchema.parse(body)

    const { pipeline, columns } = buildSafePipelineWithColumns({
      baseCollection: parsed.baseCollection,
      base: parsed.base,
      resultLevel: parsed.resultLevel,
      joins: parsed.joins,
      joinColumns: parsed.joinColumns,
      joinConditions: parsed.joinConditions,
      joinSort: parsed.joinSort,
      paging: parsed.paging,
      sortField: parsed.sort.field,
      sortDir: parsed.sort.direction,
      cursor: parsed.cursor,
    })

    const client = await getMongoClient()
    const coll = client.db(dbName).collection<Document>(parsed.baseCollection)

    // Main joined query
    const docs = await coll.aggregate<Document>(pipeline, { maxTimeMS: 20_000 }).toArray()

    // Robust hasNext + nextCursor: probe POLY-only using the early stages of the pipeline
    const polyPageSize = parsed.paging.poly.pageSize

    const polyProbePipeline: Document[] = []
    for (const stage of pipeline) {
      polyProbePipeline.push(stage)
      // Stop after the early $project that keeps POLYID/_id/sort key
      if ('$project' in stage) break
    }

    const polyDocs = await coll
      .aggregate<Document>(polyProbePipeline, { maxTimeMS: 10_000 })
      .toArray()

    const polyHasNext = polyDocs.length > polyPageSize
    const polyPage = polyHasNext ? polyDocs.slice(0, polyPageSize) : polyDocs

    let nextCursor: string | null = null
    if (polyHasNext && polyPage.length > 0) {
      const lastPoly = polyPage[polyPage.length - 1]
      const id = lastPoly?._id
      nextCursor = encodeCursor({ id: String(id) })
    }

    return NextResponse.json({
      rows: docs, // joined/unwound rows
      columns,
      hasNext: polyHasNext,
      nextCursor,
    })
  } catch (err: unknown) {
    if (isZodLikeError(err)) {
      return NextResponse.json(
        { error: 'Request validation failed', issues: err.issues },
        { status: 400 }
      )
    }
    const status = getErrorStatus(err)
    const message = getErrorMessage(err)
    const res = NextResponse.json({ error: message }, { status })
    const retryAfterSec = getRetryAfterSec(err)
    if (status === 429 && retryAfterSec != null)
      res.headers.set('Retry-After', String(retryAfterSec))
    return res
  }
}

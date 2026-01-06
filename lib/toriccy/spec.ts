// lib/toriccy/spec.ts
import 'server-only'
import { z } from 'zod'

export const OperatorSchema = z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'])

export const ConditionSchema = z.object({
  field: z.string().min(1),
  op: OperatorSchema,
  value: z.string().default(''),
})

export const PagingStageSchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
})

const SortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export const JoinedQueryRequestSchema = z.object({
  baseCollection: z.literal('POLY'),
  base: z.object({
    collection: z.literal('POLY'),
    // ✅ Allow empty projection
    columns: z.array(z.string()).default([]),
    conditions: z.array(ConditionSchema).default([]),
  }),

  resultLevel: z.enum(['POLY', 'GEOM', 'TRIANG', 'INVOL', 'SWISSCHEESE']).default('POLY'),

  joins: z.array(z.enum(['GEOM', 'TRIANG', 'INVOL', 'SWISSCHEESE'])).default([]),

  joinColumns: z
    .object({
      GEOM: z.array(z.string()).default([]),
      TRIANG: z.array(z.string()).default([]),
      INVOL: z.array(z.string()).default([]),
      SWISSCHEESE: z.array(z.string()).default([]),
    })
    .default({ GEOM: [], TRIANG: [], INVOL: [], SWISSCHEESE: [] }),

  joinConditions: z
    .object({
      GEOM: z.array(ConditionSchema).default([]),
      TRIANG: z.array(ConditionSchema).default([]),
      INVOL: z.array(ConditionSchema).default([]),
      SWISSCHEESE: z.array(ConditionSchema).default([]),
    })
    .default({ GEOM: [], TRIANG: [], INVOL: [], SWISSCHEESE: [] }),

  joinSort: z
    .object({
      GEOM: SortSchema.default({ field: 'GEOMN', direction: 'asc' }),
      TRIANG: SortSchema.default({ field: 'TRIANGN', direction: 'asc' }),
      INVOL: SortSchema.default({ field: 'INVOLN', direction: 'asc' }),
      SWISSCHEESE: SortSchema.default({ field: 'GEOMN', direction: 'asc' }),
    })
    .default({
      GEOM: { field: 'GEOMN', direction: 'asc' },
      TRIANG: { field: 'TRIANGN', direction: 'asc' },
      INVOL: { field: 'INVOLN', direction: 'asc' },
      SWISSCHEESE: { field: 'GEOMN', direction: 'asc' },
    }),

  paging: z
    .object({
      poly: PagingStageSchema.default({ pageSize: 25 }),
      geom: PagingStageSchema.default({ pageSize: 25 }),
      triang: PagingStageSchema.default({ pageSize: 25 }),
      invol: PagingStageSchema.default({ pageSize: 25 }),
      swiss: PagingStageSchema.default({ pageSize: 25 }),
    })
    .default({
      poly: { pageSize: 25 },
      geom: { pageSize: 25 },
      triang: { pageSize: 25 },
      invol: { pageSize: 25 },
      swiss: { pageSize: 25 },
    }),

  cursor: z.string().nullable().default(null),

  sort: z
    .object({
      field: z.string().min(1).default('POLYID'),
      direction: z.enum(['asc', 'desc']).default('asc'),
    })
    .default({ field: 'POLYID', direction: 'asc' }),
})

export type JoinedQueryRequest = z.infer<typeof JoinedQueryRequestSchema>

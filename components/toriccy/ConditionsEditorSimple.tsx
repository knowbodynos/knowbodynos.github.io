// components/toriccy/ConditionsEditorSimple.tsx
'use client'

import React from 'react'
import type { UseFormReturn, FieldPath } from 'react-hook-form'
import type { FormValues } from '@/lib/toriccy/uiSpec'
import type { Operator } from '@/lib/toriccy/uiConfig'
import { FieldLabel, Select, Input } from './uiPrimitives'

type Condition = { field: string; op: Operator; value: string }

const OP_OPTIONS: ReadonlyArray<{ value: Operator; label: string }> = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in (comma-separated)' },
] as const

function normalizeConditions(v: unknown): Condition[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x): Condition | null => {
      if (!x || typeof x !== 'object') return null
      const o = x as Record<string, unknown>
      if (typeof o.field !== 'string') return null
      if (typeof o.op !== 'string') return null
      if (typeof o.value !== 'string') return null
      return { field: o.field, op: o.op as Operator, value: o.value }
    })
    .filter((x): x is Condition => x !== null)
}

export default function ConditionsEditorSimple({
  form,
  path,
  filterableFields,
  title,
}: {
  form: UseFormReturn<FormValues>
  path: FieldPath<FormValues>
  filterableFields: readonly string[]
  title: string
}) {
  const raw = form.watch(path) as unknown
  const conditions = normalizeConditions(raw)

  const setConditions = (next: Condition[]) => {
    // Cast through unknown to avoid explicit any and keep RHF happy with dynamic FieldPath
    form.setValue(path, next as unknown as never, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <FieldLabel>{title}</FieldLabel>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Add zero or more conditions. For <b>in</b>, use comma-separated values.
          </div>
        </div>

        <button
          type="button"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          onClick={() =>
            setConditions([
              ...conditions,
              { field: filterableFields[0] ?? '', op: 'eq', value: '' },
            ])
          }
          disabled={(filterableFields?.length ?? 0) === 0}
          title={
            (filterableFields?.length ?? 0) === 0
              ? 'No filterable fields configured'
              : 'Add condition'
          }
        >
          + Condition
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {conditions.map((c, i) => (
          <div
            key={`${c.field}-${i}`}
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 3fr auto',
                gap: 10,
                alignItems: 'end',
              }}
            >
              <div>
                <FieldLabel>Field</FieldLabel>
                <Select
                  value={c.field}
                  onChange={(e) => {
                    const next = [...conditions]
                    next[i] = { ...next[i], field: e.target.value }
                    setConditions(next)
                  }}
                >
                  {filterableFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <FieldLabel>Op</FieldLabel>
                <Select
                  value={c.op}
                  onChange={(e) => {
                    const next = [...conditions]
                    next[i] = { ...next[i], op: e.target.value as Operator }
                    setConditions(next)
                  }}
                >
                  {OP_OPTIONS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <FieldLabel>Value</FieldLabel>
                <Input
                  value={c.value}
                  onChange={(e) => {
                    const next = [...conditions]
                    next[i] = { ...next[i], value: e.target.value }
                    setConditions(next)
                  }}
                  placeholder={c.op === 'in' ? 'a,b,c' : 'value'}
                />
              </div>

              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                title="Remove condition"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {conditions.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">No conditions.</div>
        )}
      </div>
    </div>
  )
}

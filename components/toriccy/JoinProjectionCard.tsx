// components/toriccy/JoinProjectionCard.tsx
'use client'

import type { UseFormReturn, FieldPath } from 'react-hook-form'
import type { FormValues } from '@/lib/toriccy/uiSpec'
import { COLLECTIONS } from '@/lib/toriccy/uiConfig'

import { Card, FieldLabel, Select } from './uiPrimitives'
import ColumnCheckboxGrid from './ColumnCheckboxGrid'
import ConditionsEditorSimple from './ConditionsEditorSimple'

const JOINABLE = ['GEOM', 'TRIANG', 'INVOL', 'SWISSCHEESE'] as const
type Joinable = (typeof JOINABLE)[number]

type SortDirection = 'asc' | 'desc'
type JoinSortState = Partial<Record<Joinable, { field: string; direction: SortDirection }>>
type JoinColumnsState = Partial<Record<Joinable, string[]>>

// Keep this in sync with server JOIN_SORT_FIELDS in lib/toriccy/pipeline.ts
const SORT_OPTIONS: Record<Joinable, readonly string[]> = {
  GEOM: ['GEOMN', 'H11', 'NTRIANGS'],
  TRIANG: ['TRIANGN', 'H11', 'NINVOL'],
  INVOL: ['INVOLN', 'H11', 'H21+', 'H21-', 'VOLFORMPARITY'],
  SWISSCHEESE: ['GEOMN', 'H11'],
} as const

export default function JoinProjectionCard({
  form,
  onResetPaging,
  requiredJoins,
}: {
  form: UseFormReturn<FormValues>
  onResetPaging: () => void
  requiredJoins: Joinable[]
}) {
  const joins = (form.watch('joins') ?? []) as Joinable[]
  const joinColumns = (form.watch('joinColumns') ?? {}) as JoinColumnsState
  const joinSort = (form.watch('joinSort') ?? {}) as JoinSortState
  const paging = form.watch('paging')

  const requiredSet = new Set<Joinable>(requiredJoins)

  const toggleJoin = (name: Joinable, enabled: boolean) => {
    if (!enabled && requiredSet.has(name)) return

    const next = new Set<Joinable>(joins)
    if (enabled) next.add(name)
    else next.delete(name)

    form.setValue('joins', Array.from(next) as FormValues['joins'], {
      shouldDirty: true,
      shouldValidate: true,
    })
    onResetPaging()
  }

  const setJoinCols = (name: Joinable, cols: string[]) => {
    const next: JoinColumnsState = { ...joinColumns, [name]: cols }
    form.setValue('joinColumns', next as FormValues['joinColumns'], {
      shouldDirty: true,
      shouldValidate: true,
    })

    // Auto-enable join when selecting columns
    if (cols.length > 0 && !joins.includes(name)) {
      form.setValue('joins', Array.from(new Set([...joins, name])) as FormValues['joins'], {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    onResetPaging()
  }

  const setStagePageSize = (name: Joinable, n: number) => {
    // Avoid string-path `as any` by setting the full paging object
    const next = { ...paging }
    if (name === 'GEOM') next.geom.pageSize = n
    if (name === 'TRIANG') next.triang.pageSize = n
    if (name === 'INVOL') next.invol.pageSize = n
    if (name === 'SWISSCHEESE') next.swiss.pageSize = n

    form.setValue('paging', next, { shouldDirty: true, shouldValidate: true })
    onResetPaging()
  }

  const getStagePageSize = (name: Joinable) => {
    if (name === 'GEOM') return paging.geom.pageSize
    if (name === 'TRIANG') return paging.triang.pageSize
    if (name === 'INVOL') return paging.invol.pageSize
    return paging.swiss.pageSize
  }

  const defaultSortField = (name: Joinable) =>
    name === 'TRIANG' ? 'TRIANGN' : name === 'INVOL' ? 'INVOLN' : 'GEOMN'

  const getSortField = (name: Joinable) => joinSort?.[name]?.field ?? defaultSortField(name)
  const getSortDir = (name: Joinable): SortDirection => joinSort?.[name]?.direction ?? 'asc'

  const setSortField = (name: Joinable, field: string) => {
    const next: JoinSortState = {
      ...joinSort,
      [name]: { ...(joinSort[name] ?? { field: defaultSortField(name), direction: 'asc' }), field },
    }
    form.setValue('joinSort', next as FormValues['joinSort'], {
      shouldDirty: true,
      shouldValidate: true,
    })
    onResetPaging()
  }

  const setSortDir = (name: Joinable, dir: SortDirection) => {
    const next: JoinSortState = {
      ...joinSort,
      [name]: {
        ...(joinSort[name] ?? { field: defaultSortField(name), direction: 'asc' }),
        direction: dir,
      },
    }
    form.setValue('joinSort', next as FormValues['joinSort'], {
      shouldDirty: true,
      shouldValidate: true,
    })
    onResetPaging()
  }

  return (
    <Card title="Polytope-derived Features">
      <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
        Required joins are locked based on result level. Each join is limited per parent inside its
        lookup pipeline.
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {JOINABLE.map((name) => {
          const conf = COLLECTIONS[name]
          const enabled = joins.includes(name) || requiredSet.has(name)
          const locked = requiredSet.has(name)

          const selectedCols = (joinColumns?.[name] ?? []) as string[]
          const pageSize = getStagePageSize(name)

          const joinCondPath = `joinConditions.${name}` as FieldPath<FormValues>

          return (
            <div
              key={name}
              className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-md"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={locked}
                    onChange={(e) => toggleJoin(name, e.target.checked)}
                    title={locked ? 'Required by result level' : ''}
                  />
                  <span style={{ fontWeight: 800 }}>
                    {conf.label}{' '}
                    {locked ? (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>(required)</span>
                    ) : null}
                  </span>
                </label>

                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'end',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <FieldLabel>Join sort field</FieldLabel>
                    <Select
                      value={getSortField(name)}
                      onChange={(e) => setSortField(name, e.target.value)}
                    >
                      {SORT_OPTIONS[name].map((f) => (
                        <option key={f} value={f} title={conf.fieldHelp?.[f] ?? f}>
                          {f}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <FieldLabel>Dir</FieldLabel>
                    <Select
                      value={getSortDir(name)}
                      onChange={(e) => setSortDir(name, e.target.value === 'desc' ? 'desc' : 'asc')}
                    >
                      <option value="asc">asc</option>
                      <option value="desc">desc</option>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel>Per-parent cap</FieldLabel>
                    <Select
                      value={pageSize}
                      onChange={(e) => setStagePageSize(name, Number(e.target.value))}
                    >
                      {[5, 10, 25, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <FieldLabel>{name} fields (flattened columns)</FieldLabel>
                <ColumnCheckboxGrid
                  groups={conf.fieldGroups}
                  selected={selectedCols}
                  helpText={conf.fieldHelp}
                  onChange={(cols) => setJoinCols(name, cols)}
                />
              </div>

              <ConditionsEditorSimple
                form={form}
                path={joinCondPath}
                filterableFields={conf.filterableFields as unknown as readonly string[]}
                title={`${name} WHERE conditions`}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}

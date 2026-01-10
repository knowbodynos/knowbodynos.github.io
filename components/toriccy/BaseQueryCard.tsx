// components/toriccy/BaseQueryCard.tsx
'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { FormValues } from '@/lib/toriccy/uiSpec'
import { COLLECTIONS } from '@/lib/toriccy/uiConfig'

import { Card, FieldLabel, Select } from './uiPrimitives'
import ColumnCheckboxGrid from './ColumnCheckboxGrid'
import ConditionsEditorSimple from './ConditionsEditorSimple'

type SortDir = 'asc' | 'desc'

export default function BaseQueryCard({
  form,
  onResetPaging,
}: {
  form: UseFormReturn<FormValues>
  onResetPaging: () => void
}) {
  const poly = COLLECTIONS.POLY

  const baseColumns = form.watch('baseColumns') ?? []
  const sort = form.watch('sort')
  const polyPageSize = form.watch('paging.poly.pageSize')

  const sortField = sort?.field ?? poly.sortableFields?.[0] ?? 'POLYID'
  const sortDir: SortDir = sort?.direction === 'desc' ? 'desc' : 'asc'

  const setSortField = (field: string) => {
    form.setValue('sort', { ...sort, field }, { shouldDirty: true, shouldValidate: true })
    onResetPaging()
  }

  const setSortDir = (dir: SortDir) => {
    form.setValue('sort', { ...sort, direction: dir }, { shouldDirty: true, shouldValidate: true })
    onResetPaging()
  }

  const setPolyPageSize = (n: number) => {
    const paging = form.getValues('paging')
    form.setValue(
      'paging',
      { ...paging, poly: { ...paging.poly, pageSize: n } },
      { shouldDirty: true, shouldValidate: true }
    )
    onResetPaging()
  }

  return (
    <Card
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 800 }}>Polytope Features (POLY)</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Cursor-paged POLY, used as the root for joins.
            </div>
          </div>

          {/* compressed controls on the RIGHT, like join cards */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240 }}>
              <FieldLabel>Sort</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <Select value={sortField} onChange={(e) => setSortField(e.target.value)}>
                  {(poly.sortableFields as readonly string[]).map((f) => (
                    <option key={f} value={f} title={poly.fieldHelp?.[f] ?? f}>
                      {f}
                    </option>
                  ))}
                </Select>

                <Select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value === 'desc' ? 'desc' : 'asc')}
                >
                  <option value="asc">asc</option>
                  <option value="desc">desc</option>
                </Select>
              </div>
            </div>

            <div style={{ minWidth: 140 }}>
              <FieldLabel>Page size</FieldLabel>
              <Select
                value={polyPageSize}
                onChange={(e) => setPolyPageSize(Number(e.target.value))}
              >
                {[10, 25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      }
    >
      <div style={{ marginTop: 10 }}>
        <FieldLabel>POLY columns (output)</FieldLabel>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Optional. You can return <b>zero</b> Polytope columns and only join-level columns.
          <br />
          <b>POLYID is always used internally</b> for joins/paging but is not returned unless you
          select it.
        </div>

        <ColumnCheckboxGrid
          groups={poly.fieldGroups}
          selected={baseColumns}
          helpText={poly.fieldHelp}
          onChange={(cols) => {
            form.setValue('baseColumns', cols, { shouldDirty: true, shouldValidate: true })
            onResetPaging()
          }}
        />
      </div>

      <ConditionsEditorSimple
        form={form}
        path={'baseConditions'}
        // IMPORTANT: use filterableFields (not full fields) so the selector isn't overloaded
        filterableFields={poly.filterableFields as unknown as readonly string[]}
        title="Polytope WHERE conditions"
      />
    </Card>
  )
}

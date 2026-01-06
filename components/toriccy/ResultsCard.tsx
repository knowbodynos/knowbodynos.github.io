// components/toriccy/ResultsCard.tsx
'use client'

import { Card, Button } from './uiPrimitives'
import DataTable from './DataTable'

export default function ResultsCard({
  rows,
  columns,
  canPrev,
  canNext,
  isPending,
  error,
  onPrev,
  onNext,
}: {
  rows: Record<string, unknown>[]
  columns: string[]
  canPrev: boolean
  canNext: boolean
  isPending: boolean
  error: Error | null
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <Card
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          <div>Results</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button type="button" disabled={!canPrev || isPending} onClick={onPrev}>
              Prev (POLY)
            </Button>
            <Button type="button" disabled={!canNext || isPending} onClick={onNext}>
              Next (POLY)
            </Button>
          </div>
        </div>
      }
    >
      {error && (
        <div style={{ marginBottom: 10, color: '#b91c1c', fontSize: 13 }}>{error.message}</div>
      )}
      <DataTable rows={rows} columns={columns} />
      <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
        Note: paging controls move through POLY pages. Join caps limit fan-out per parent inside
        lookups.
      </div>
    </Card>
  )
}

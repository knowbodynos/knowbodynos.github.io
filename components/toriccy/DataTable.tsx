// components/toriccy/DataTable.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef, ColumnOrderState, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

function valueToCellString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

// TSV needs to avoid literal tabs/newlines inside cells unless you want quoting (we won't).
function sanitizeTsvCell(s: string): string {
  return s
    .replaceAll('\r\n', ' ')
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ')
    .replaceAll('\t', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function rowsToTsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => sanitizeTsvCell(String(c))).join('\t')
  const lines = rows.map((row) =>
    columns.map((c) => sanitizeTsvCell(valueToCellString(row[c]))).join('\t')
  )
  return [header, ...lines].join('\n')
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

type CopyKind = 'cell' | 'row' | 'column' | 'table'

export default function DataTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[]
  columns: string[]
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [copied, setCopied] = useState<{ at: number; kind: CopyKind } | null>(null)

  const dragFromRef = useRef<string | null>(null)

  const columnsKey = useMemo(() => (columns ?? []).map(String).join('|'), [columns])

  // Keep columnOrder synced with columns list
  useEffect(() => {
    const ids = (columns ?? []).map(String)

    setColumnOrder((prev) => {
      if (prev.length === 0) return ['__rownum__', ...ids]

      // Always keep gutter at front
      const prevNoGutter = prev.filter((x) => x !== '__rownum__')
      const prevSet = new Set(prevNoGutter)

      const next: string[] = []

      for (const id of prevNoGutter) if (ids.includes(id)) next.push(id)
      for (const id of ids) if (!prevSet.has(id)) next.push(id)

      return ['__rownum__', ...next]
    })
  }, [columnsKey, columns])

  const colDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      (columns ?? []).map((key) => ({
        id: key,
        header: () => key,
        accessorKey: key,
        enableSorting: true,
        cell: (ctx) => valueToCellString(ctx.getValue()),
      })),
    [columns]
  )

  const table = useReactTable({
    data: rows,
    columns: colDefs,

    state: { sorting, columnOrder },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),

    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    defaultColumn: { size: 160, minSize: 80, maxSize: 800 },
  })

  const toastCopied = (kind: CopyKind) => {
    setCopied({ at: Date.now(), kind })
    window.setTimeout(() => setCopied(null), 900)
  }

  const doCopyText = async (text: string, kind: CopyKind) => {
    try {
      await writeClipboardText(text)
      toastCopied(kind)
    } catch {
      // ignore
    }
  }

  const moveColumn = (fromId: string, toId: string) => {
    if (fromId === '__rownum__' || toId === '__rownum__') return // keep gutter pinned
    setColumnOrder((prev) => {
      const order =
        prev.length > 0 ? [...prev] : ['__rownum__', ...table.getAllLeafColumns().map((c) => c.id)]
      const fromIdx = order.indexOf(fromId)
      const toIdx = order.indexOf(toId)
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return order

      order.splice(fromIdx, 1)
      order.splice(toIdx, 0, fromId)
      return order
    })
  }

  const currentCols = () =>
    table
      .getAllLeafColumns()
      .map((c) => c.id)
      .filter((id) => id !== '__rownum__')

  const currentRows = () => table.getRowModel().rows.map((r) => r.original)

  const getCurrentTsv = () => rowsToTsv(currentCols(), currentRows())

  const downloadTsv = () => {
    const tsv = getCurrentTsv()
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const ts = new Date().toISOString().replaceAll(':', '-')
    const filename = `query-results-${ts}.tsv`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const copyTableAsTsv = async () => {
    await doCopyText(getCurrentTsv(), 'table')
  }

  const copyRowAsTsv = async (rowObj: Record<string, unknown>) => {
    const cols = currentCols()
    const line = cols.map((c) => sanitizeTsvCell(valueToCellString(rowObj[c]))).join('\t')
    await doCopyText(line, 'row')
  }

  const copyColumnAsTsv = async (colId: string) => {
    const col = String(colId)
    const lines = table
      .getRowModel()
      .rows.map((r) => sanitizeTsvCell(valueToCellString(r.original[col])))
    await doCopyText(lines.join('\n'), 'column')
  }

  const hasData = (columns?.length ?? 0) > 0 && table.getRowModel().rows.length > 0

  const headers = table.getHeaderGroups()[0]?.headers ?? []

  return (
    <div className="w-full">
      {copied && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
          {copied.kind === 'cell' && 'Copied cell'}
          {copied.kind === 'row' && 'Copied row'}
          {copied.kind === 'column' && 'Copied column'}
          {copied.kind === 'table' && 'Copied table'}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-max overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 w-[56px] border-b border-gray-200 bg-white px-3 py-2 text-left text-xs font-black text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                  #
                </th>

                {headers.map((h) => {
                  const canSort = h.column.getCanSort()
                  const sortDir = h.column.getIsSorted() // false | 'asc' | 'desc'
                  const colId = h.column.id

                  return (
                    <th
                      key={h.id}
                      className="sticky top-0 z-10 border-b border-gray-200 bg-white text-left text-xs font-black text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                      style={{ width: h.getSize(), minWidth: h.getSize() }}
                    >
                      <button
                        className="group relative flex items-center gap-2 px-3 py-2 select-none"
                        style={{ width: '100%', textAlign: 'left' }}
                        draggable
                        onDragStart={(e) => {
                          dragFromRef.current = colId
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', colId)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          const from = dragFromRef.current ?? e.dataTransfer.getData('text/plain')
                          dragFromRef.current = null
                          if (from && from !== colId) moveColumn(from, colId)
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          const from = dragFromRef.current
                          if (from && from !== colId) moveColumn(from, colId)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            const from = dragFromRef.current
                            if (from && from !== colId) moveColumn(from, colId)
                          }
                        }}
                        aria-label={`Column header: ${colId}. Drag to reorder.`}
                      >
                        <span>{colId}</span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {table.getRowModel().rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`group ${
                    idx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900/40'
                  }`}
                >
                  {/* Row-number gutter: button inside td (a11y-safe) */}
                  <td className="border-b border-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-900 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => copyRowAsTsv(r.original)}
                      className="flex w-full items-center gap-2 rounded-lg text-left outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950"
                      title="Click to copy this row as TSV"
                    >
                      <span>{idx + 1}</span>
                      <span className="hidden rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm group-hover:inline-flex dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                        Copy
                      </span>
                    </button>
                  </td>

                  {r.getVisibleCells().map((c) => {
                    const text = valueToCellString(c.getValue())
                    return (
                      <td
                        key={c.id}
                        className="border-b border-gray-100 px-0 py-0 text-sm text-gray-900 dark:border-gray-900 dark:text-gray-100"
                        style={{ width: c.column.getSize(), maxWidth: c.column.getSize() }}
                      >
                        {/* a11y-safe: button inside td */}
                        <button
                          type="button"
                          onClick={() => doCopyText(text, 'cell')}
                          className="block w-full px-3 py-2 text-left outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title="Click to copy cell"
                        >
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(columns.length + 1, 1)}
                    className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
        <div>
          Tip: drag headers to reorder · click header to sort · drag header edge to resize · click a
          cell to copy · click row # to copy row · click header “Copy” to copy column.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => table.resetColumnOrder()}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            title="Reset column order"
          >
            Reset columns
          </button>

          <button
            type="button"
            onClick={copyTableAsTsv}
            disabled={!hasData}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            title="Copy current table (respects reorder + sort) as TSV"
          >
            Copy table as TSV
          </button>

          <button
            type="button"
            onClick={downloadTsv}
            disabled={!hasData}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            title="Download current table (respects reorder + sort) as TSV"
          >
            Download TSV
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        TSV export sanitizes tabs/newlines inside cells to keep the output rectangular.
      </div>
    </div>
  )
}

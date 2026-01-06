// components/toriccy/ColumnCheckboxGrid.tsx
'use client'

import React from 'react'

type FieldGroup = {
  title: string
  fields: readonly string[]
}

export default function ColumnCheckboxGrid({
  // Either pass grouped fields (preferred) OR a flat list (fallback)
  groups,
  options,
  selected,
  onChange,
  helpText,
  columns = 3,
}: {
  groups?: readonly FieldGroup[]
  options?: readonly string[]
  selected: readonly string[]
  onChange: (next: string[]) => void
  helpText?: Record<string, string>
  columns?: number
}) {
  const selectedSet = new Set(selected ?? [])

  const toggle = (field: string, checked: boolean) => {
    const next = new Set(selectedSet)
    if (checked) next.add(field)
    else next.delete(field)
    onChange(Array.from(next))
  }

  const renderGroup = (title: string, fields: readonly string[]) => (
    <div
      key={title}
      className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
    >
      <div className="mb-2 text-xs font-black text-gray-700 dark:text-gray-200">{title}</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {fields.map((field) => {
          const checked = selectedSet.has(field)
          const tip = helpText?.[field] ?? field

          return (
            <label
              key={field}
              title={tip}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggle(field, e.target.checked)}
                title={tip}
              />
              <span className="font-mono text-[12px]">{field}</span>
            </label>
          )
        })}
      </div>
    </div>
  )

  // Preferred grouped rendering
  if (groups && groups.length > 0) {
    return <div className="grid gap-10">{groups.map((g) => renderGroup(g.title, g.fields))}</div>
  }

  // Fallback flat rendering
  const flat = options ?? []
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {flat.map((field) => {
        const checked = selectedSet.has(field)
        const tip = helpText?.[field] ?? field

        return (
          <label
            key={field}
            title={tip}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            style={{ cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => toggle(field, e.target.checked)}
              title={tip}
            />
            <span className="font-mono text-[12px]">{field}</span>
          </label>
        )
      })}
    </div>
  )
}

// components/toriccy/RunQueryCard.tsx
'use client'

import React from 'react'
import { Card, Button, FieldLabel, Select } from './uiPrimitives'

type Level = 'POLY' | 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'

export default function RunQueryCard({
  resultLevel,
  suggestedLevel,
  isAuto,
  onChangeResultLevel,
  onUseSuggested,
  onRun,
  onReset,
  disabled,
  loading,
  error,
}: {
  resultLevel: Level
  suggestedLevel: Level
  isAuto: boolean
  onChangeResultLevel: (level: Level) => void
  onUseSuggested: () => void

  onRun: () => void
  onReset: () => void
  disabled: boolean
  loading: boolean
  error: string | null
}) {
  return (
    <Card
      title={
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Run query</div>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Result level controls the deepest stage to unwind/page to.
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px]">
              <FieldLabel>Result level</FieldLabel>
              <div className="flex items-center gap-2">
                <Select
                  value={resultLevel}
                  onChange={(e) => onChangeResultLevel(e.target.value as Level)}
                >
                  <option value="POLY">POLY</option>
                  <option value="GEOM">GEOM</option>
                  <option value="TRIANG">TRIANG</option>
                  <option value="INVOL">INVOL</option>
                  <option value="SWISSCHEESE">SWISSCHEESE</option>
                </Select>

                <div className="text-[11px] whitespace-nowrap text-gray-500 dark:text-gray-400">
                  Auto: <span className="font-bold">{suggestedLevel}</span>
                  {!isAuto && (
                    <button
                      type="button"
                      className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-1 font-semibold text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                      onClick={onUseSuggested}
                      title="Set result level back to the auto-suggested deepest selection"
                    >
                      Use auto
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Button type="button" onClick={onReset}>
              Reset form
            </Button>

            <Button type="button" onClick={onRun} disabled={disabled}>
              {loading ? 'Running…' : 'Run query'}
            </Button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
    </Card>
  )
}

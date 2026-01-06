// app/toriccy/page.tsx
'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'

import { FormSchema, type FormValues } from '@/lib/toriccy/uiSpec'
import { toApiPayload, postJoinedQuery, type JoinedQueryResponse } from '@/lib/toriccy/client'

import BaseQueryCard from '@/components/toriccy/BaseQueryCard'
import JoinProjectionCard from '@/components/toriccy/JoinProjectionCard'
import ResultsCard from '@/components/toriccy/ResultsCard'
import RunQueryCard from '@/components/toriccy/RunQueryCard'

type Level = FormValues['resultLevel']
type Joinable = 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'

function requiredJoinsForLevel(level: Level): Joinable[] {
  switch (level) {
    case 'POLY':
      return []
    case 'GEOM':
      return ['GEOM']
    case 'TRIANG':
      return ['GEOM', 'TRIANG']
    case 'INVOL':
      return ['GEOM', 'TRIANG', 'INVOL']
    case 'SWISSCHEESE':
      return ['GEOM', 'SWISSCHEESE']
  }
}

function deepestLevelFromSelection(values: FormValues): Level {
  const joins = new Set(values.joins ?? [])
  const joinCols = values.joinColumns ?? { GEOM: [], TRIANG: [], INVOL: [], SWISSCHEESE: [] }

  const hasGeom = joins.has('GEOM') || (joinCols.GEOM?.length ?? 0) > 0
  const hasTriang = joins.has('TRIANG') || (joinCols.TRIANG?.length ?? 0) > 0
  const hasInvol = joins.has('INVOL') || (joinCols.INVOL?.length ?? 0) > 0
  const hasSwiss = joins.has('SWISSCHEESE') || (joinCols.SWISSCHEESE?.length ?? 0) > 0

  if (hasInvol) return 'INVOL'
  if (hasTriang) return 'TRIANG'
  if (hasSwiss) return 'SWISSCHEESE'
  if (hasGeom) return 'GEOM'
  return 'POLY'
}

export default function ToriccyPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: 'onChange',
    defaultValues: FormSchema.parse({}),
  })

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [hasNext, setHasNext] = useState<boolean>(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)

  const values = form.watch()

  const requiredJoins = useMemo<Joinable[]>(
    () => requiredJoinsForLevel(values.resultLevel),
    [values.resultLevel]
  )

  // Lock on required joins whenever resultLevel changes
  useEffect(() => {
    const current = new Set<Joinable>(values.joins ?? [])
    let changed = false
    for (const j of requiredJoins) {
      if (!current.has(j)) {
        current.add(j)
        changed = true
      }
    }
    if (changed) {
      form.setValue('joins', Array.from(current), { shouldDirty: true, shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredJoins.join('|')])

  const suggestedLevel = useMemo<Level>(() => {
    const joinsDependency = values.joins?.join('|') ?? ''
    const geomJoinColumns = (values.joinColumns?.GEOM ?? []).join('|')
    const triangJoinColumns = (values.joinColumns?.TRIANG ?? []).join('|')
    const involJoinColumns = (values.joinColumns?.INVOL ?? []).join('|')
    const swissJoinColumns = (values.joinColumns?.SWISSCHEESE ?? []).join('|')

    return deepestLevelFromSelection(values)
  }, [values])

  // Auto-set resultLevel until user overrides it
  useEffect(() => {
    const dirty = form.formState.dirtyFields as Partial<Record<keyof FormValues, unknown>>
    const userTouched = Boolean(dirty.resultLevel)
    if (!userTouched && values.resultLevel !== suggestedLevel) {
      form.setValue('resultLevel', suggestedLevel, { shouldDirty: false, shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedLevel])

  const isAuto = useMemo(() => {
    const dirty = form.formState.dirtyFields as Partial<Record<keyof FormValues, unknown>>
    return !dirty.resultLevel
  }, [form.formState.dirtyFields])

  const onResetPaging = useCallback(() => {
    setCursor(null)
    setNextCursor(null)
    setHasNext(false)
  }, [])

  const buildPayload = useCallback(
    (cursorOverride: string | null) => {
      const v = form.getValues()
      return toApiPayload(v, cursorOverride)
    },
    [form]
  )

  const mutation = useMutation<JoinedQueryResponse, Error, { cursorOverride: string | null }>({
    mutationFn: async ({ cursorOverride }) => postJoinedQuery(buildPayload(cursorOverride)),
    onSuccess: (data) => {
      setRows(data.rows ?? [])
      setColumns(data.columns ?? (data.rows?.[0] ? Object.keys(data.rows[0]) : []))
      setHasNext(Boolean(data.hasNext))
      setNextCursor(data.nextCursor ?? null)
    },
  })

  const runQuery = useCallback(() => {
    onResetPaging()
    mutation.mutate({ cursorOverride: null })
  }, [mutation, onResetPaging])

  const nextPage = useCallback(() => {
    if (!nextCursor) return
    setCursor(nextCursor)
    mutation.mutate({ cursorOverride: nextCursor })
  }, [mutation, nextCursor])

  const resetForm = useCallback(() => {
    form.reset(FormSchema.parse({}))
    onResetPaging()
    setRows([])
    setColumns([])
  }, [form, onResetPaging])

  const onChangeResultLevel = useCallback(
    (lvl: Level) => {
      form.setValue('resultLevel', lvl, { shouldDirty: true, shouldValidate: true })
      onResetPaging()
    },
    [form, onResetPaging]
  )

  const onUseSuggested = useCallback(() => {
    // set back to suggested, and clear "dirty" for resultLevel by resetting *only that field*
    // easiest: setValue without dirty + trigger validation
    form.setValue('resultLevel', suggestedLevel, { shouldDirty: false, shouldValidate: true })
    onResetPaging()
  }, [form, onResetPaging, suggestedLevel])

  const prevDisabled = cursor == null || mutation.isPending
  const nextDisabled = !hasNext || !nextCursor || mutation.isPending

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4">
        <div className="text-2xl font-black text-gray-900 dark:text-gray-100">Toriccy Query</div>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Build a safe structured query, join hierarchically, and export results.
        </div>
      </div>

      <div className="grid gap-4">
        <BaseQueryCard form={form} onResetPaging={onResetPaging} />
        <JoinProjectionCard
          form={form}
          onResetPaging={onResetPaging}
          requiredJoins={requiredJoins}
        />

        {/* Run card ABOVE results */}
        <RunQueryCard
          resultLevel={values.resultLevel}
          suggestedLevel={suggestedLevel}
          isAuto={isAuto}
          onChangeResultLevel={onChangeResultLevel}
          onUseSuggested={onUseSuggested}
          onRun={runQuery}
          onReset={resetForm}
          disabled={!form.formState.isValid || mutation.isPending}
          loading={mutation.isPending}
          error={mutation.isError ? (mutation.error?.message ?? 'Query failed') : null}
        />

        <ResultsCard
          rows={rows}
          columns={columns}
          loading={mutation.isPending}
          error={mutation.isError ? (mutation.error?.message ?? 'Query failed') : null}
          hasNext={hasNext}
          onNext={nextPage}
          nextDisabled={nextDisabled}
          prevDisabled={prevDisabled}
          onPrev={() => {}}
        />
      </div>
    </div>
  )
}

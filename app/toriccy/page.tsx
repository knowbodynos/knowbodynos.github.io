// app/toriccy/page.tsx
'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'

import { FormSchema, type FormValues } from '@/lib/toriccy/uiSpec'
import { toApiPayload, postJoinedQuery, type JoinedQueryResponse } from '@/lib/toriccy/client'

import BaseQueryCard from '@/components/toriccy/BaseQueryCard'
import JoinProjectionCard from '@/components/toriccy/JoinProjectionCard'
import ResultsCard from '@/components/toriccy/ResultsCard'
import RunQueryCard from '@/components/toriccy/RunQueryCard'
import { Scholar } from '@/components/social-icons/icons'

type Level = FormValues['resultLevel']
type Joinable = 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'

function Page() {
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
      default:
        return []
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

  // Type-safe zodResolver wrapper to avoid 'any' and type errors
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues, object>,
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
        <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
          Query the Toric Calabi-Yau Database
        </div>
      </div>

      {/* Description card */}
      <div className="mb-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <Scholar
              className="h-6 w-6 flex-shrink-0 fill-current text-gray-500 dark:text-gray-400"
              aria-hidden
            />
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              About ToricCY Database
            </div>
          </div>
          <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              This database is based on{' '}
              <a
                href="https://arxiv.org/abs/1411.1418"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-300"
              >
                arXiv:1411.1418
              </a>
              ,{' '}
              <a
                href="https://arxiv.org/abs/1706.09070"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-300"
              >
                arXiv:1706.09070
              </a>
              , and{' '}
              <a
                href="https://arxiv.org/abs/2111.03078"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-300"
              >
                arXiv:2111.03078
              </a>
              . Please cite us!
            </p>

            <p>
              Constructed with support from the National Science Foundation under grant{' '}
              <b>NSF/CCF-1048082, EAGER: CiC: A String Cartography</b>.
            </p>

            <p>
              Contact{' '}
              <a
                href="mailto:ross.e.altman@gmail.com?Subject=Toric%20Calabi-Yau%20Threefold%20Database"
                className="text-blue-600 dark:text-blue-300"
              >
                Ross Altman
              </a>{' '}
              with questions.
            </p>
          </div>
        </div>
      </div>

      {/* Download card (separate) */}
      <div className="mb-6">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400"
              aria-hidden
            >
              <title>Download</title>
              <path
                d="M12 3v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M5 10l7 7 7-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M21 21H3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div>
              Need the full dataset? Download the packaged ToricCY database for local analysis.
            </div>
          </div>
          <div>
            <a
              href="https://app.box.com/s/ch4w5gy1wv9dv11ptf314u7ovj2x4vig"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              Download full database
            </a>
          </div>
        </div>
      </div>

      {/* short instruction (moved here so it's clearly associated with the form) */}

      <div className="mb-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start space-x-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="mt-0.5 h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400"
              aria-hidden
            >
              <title>Info</title>
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 8v1.5M12 11v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              This interface lets you build safe structured queries against the ToricCY dataset. Use
              the controls below to select joins, projections, and result granularity — then run
              queries to preview or export results.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-white p-1 dark:from-blue-900/40">
          <BaseQueryCard form={form} onResetPaging={onResetPaging} />
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-green-100 to-white p-1 dark:from-green-900/30">
          <JoinProjectionCard
            form={form}
            onResetPaging={onResetPaging}
            requiredJoins={requiredJoins}
          />
        </div>

        {/* Run card ABOVE results */}
        <div className="rounded-2xl bg-gradient-to-r from-yellow-100 to-white p-1 dark:from-yellow-900/25">
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
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-slate-100 to-white p-1 dark:from-slate-900/30">
          <ResultsCard
            rows={rows}
            columns={columns}
            isPending={mutation.isPending}
            error={mutation.isError ? (mutation.error as Error) : null}
            canNext={hasNext && !!nextCursor && !mutation.isPending}
            canPrev={cursor != null && !mutation.isPending}
            onNext={nextPage}
            onPrev={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

export default Page

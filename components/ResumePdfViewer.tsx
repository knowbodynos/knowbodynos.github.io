'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker can stay legacy too
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export default function ResumePdfViewer({ pdfUrl }: { pdfUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(900)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerWidth(Math.max(320, el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pageWidth = useMemo(() => {
    const maxReadable = 900
    const base = Math.min(containerWidth, maxReadable)
    return Math.floor(base * zoom)
  }, [containerWidth, zoom])

  const zoomIn = () => setZoom((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10))
  const zoomOut = () => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))
  const resetZoom = () => setZoom(1)

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-100 p-3 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        <b>Failed to load PDF</b>
        <div className="mt-1 whitespace-pre-wrap">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="font-bold">Resume Viewer</div>
        <button
          onClick={zoomOut}
          className="cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          type="button"
        >
          −
        </button>
        <div className="min-w-[70px] text-center">{Math.round(zoom * 100)}%</div>
        <button
          onClick={zoomIn}
          className="cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          type="button"
        >
          +
        </button>
        <button
          onClick={resetZoom}
          className="cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          type="button"
        >
          Fit
        </button>

        <div className="ml-auto flex items-center gap-3">
          {numPages ? (
            <div className="text-sm">
              {numPages} page{numPages === 1 ? '' : 's'}
            </div>
          ) : null}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-300"
          >
            Open raw PDF ↗
          </a>
          <a href={pdfUrl} download className="text-blue-600 dark:text-blue-300">
            Download
          </a>
        </div>
      </div>

      <div ref={containerRef} className="bg-gray-100 p-4 dark:bg-slate-950">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(e: Error) => setError(e.message)}
          loading={<div className="p-4">Loading PDF…</div>}
        >
          <div className="flex flex-col gap-4">
            {Array.from({ length: numPages || 1 }, (_, i) => (
              <div
                key={i + 1}
                className="mx-auto overflow-auto rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-lg"
              >
                <Page pageNumber={i + 1} width={pageWidth} />
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  )
}

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
      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: '#fee2e2',
          border: '1px solid #fecaca',
        }}
      >
        <b>Failed to load PDF</b>
        <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(246,247,249,0.9)',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontWeight: 700 }}>Resume Viewer</div>
        <button onClick={zoomOut} style={btnStyle} type="button">
          −
        </button>
        <div style={{ minWidth: 70, textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
        <button onClick={zoomIn} style={btnStyle} type="button">
          +
        </button>
        <button onClick={resetZoom} style={btnStyle} type="button">
          Fit
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {numPages ? (
            <div style={{ fontSize: 13 }}>
              {numPages} page{numPages === 1 ? '' : 's'}
            </div>
          ) : null}
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            Open raw PDF ↗
          </a>
          <a href={pdfUrl} download>
            Download
          </a>
        </div>
      </div>

      <div ref={containerRef} style={{ padding: 16, background: '#f6f7f9' }}>
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(e: Error) => setError(e.message)}
          loading={<div style={{ padding: 16 }}>Loading PDF…</div>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: numPages || 1 }, (_, i) => (
              <div key={i + 1} style={pageCardStyle}>
                <Page pageNumber={i + 1} width={pageWidth} />
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: 'white',
  cursor: 'pointer',
}

const pageCardStyle: React.CSSProperties = {
  margin: '0 auto',
  padding: 10,
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  background: 'white',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  overflow: 'auto',
}

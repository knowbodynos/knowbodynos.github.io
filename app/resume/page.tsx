// app/resume/page.tsx
'use client'

import dynamic from 'next/dynamic'

const ResumePdfViewer = dynamic(() => import('@/components/ResumePdfViewer'), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Loading viewer…</div>,
})

export default function Page() {
  const pdfUrl =
    'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf'

  return <ResumePdfViewer pdfUrl={pdfUrl} />
}

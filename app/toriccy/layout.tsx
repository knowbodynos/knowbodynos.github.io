import QueryProviders from './providers'

export default function QueryLayout({ children }: { children: React.ReactNode }) {
  return <QueryProviders>{children}</QueryProviders>
}

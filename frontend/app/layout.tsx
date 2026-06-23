import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lucy Apply',
  description: 'International student admissions platform for Ethiopian universities',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="container">
            <Link href="/" className="nav-brand">
              Lucy Apply
            </Link>
            <div className="nav-links">
              <Link href="/universities">Universities</Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </div>
          </div>
        </nav>
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  )
}

import { useState } from 'react'
import { About } from '../components/About'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { HistoryList } from '../components/HistoryList'
import { QRCodeGenerator } from '../components/QRCodeGenerator'
import { URLShortener } from '../components/URLShortener'
import { emitEvent, LINKS_CHANGED_EVENT } from '../lib/events'

export function Home() {
  const [activeTool, setActiveTool] = useState<'qr' | 'shortener'>('qr')

  const handleShortened = () => {
    emitEvent(LINKS_CHANGED_EVENT)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main-content" className="flex-1">
        <Hero onSelectTool={setActiveTool} />

        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <QRCodeGenerator isActive={activeTool === 'qr'} />
          <URLShortener isActive={activeTool === 'shortener'} onShortened={handleShortened} />
          <HistoryList />
          <About />
        </div>
      </main>

      <Footer />
    </div>
  )
}

import { Link2, QrCode, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { scrollToSection } from '../lib/navigation'

interface HeroProps {
  onSelectTool: (tool: 'qr' | 'shortener') => void
}

const TOOLS = [
  {
    id: 'qr-generator' as const,
    key: 'qr' as const,
    title: 'QR Code Generator',
    description: 'Turn any link into a crisp, customisable QR code you can download instantly.',
    icon: QrCode,
  },
  {
    id: 'url-shortener' as const,
    key: 'shortener' as const,
    title: 'URL Shortener',
    description: 'Replace long URLs with a short link that redirects visitors to the real destination.',
    icon: Link2,
  },
]

const HIGHLIGHTS = [
  { icon: Zap, label: 'Instant QR generation' },
  { icon: ShieldCheck, label: 'Safe, validated redirects' },
  { icon: Sparkles, label: 'Full colour customisation' },
]

export function Hero({ onSelectTool }: HeroProps) {
  const handleSelect = (tool: 'qr' | 'shortener') => {
    onSelectTool(tool)
    scrollToSection(tool === 'qr' ? 'qr-generator' : 'url-shortener')
  }

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 uppercase shadow-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            QR codes &amp; short links, in one place
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            One Link. Endless Possibilities.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Generate QR codes and shorten your links in seconds.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelect(tool.key)}
                  className="card group flex items-start gap-4 p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      {tool.title}
                      <span
                        className="text-indigo-600 transition group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">{tool.description}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
            {HIGHLIGHTS.map((highlight) => {
              const Icon = highlight.icon
              return (
                <li key={highlight.label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                  {highlight.label}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

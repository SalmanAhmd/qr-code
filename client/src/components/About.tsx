import { Database, Gauge, Lock, QrCode, Server, Smartphone } from 'lucide-react'

const FEATURES = [
  {
    icon: QrCode,
    title: 'Browser-side QR codes',
    description:
      'QR codes are rendered locally in your browser with the qrcode library. Your links are never sent anywhere to be encoded.',
  },
  {
    icon: Server,
    title: 'Real short links',
    description:
      'Short links are stored in SQLite and resolved by the server, so they keep working across restarts and can be shared with anyone.',
  },
  {
    icon: Lock,
    title: 'Validated destinations',
    description:
      'Only http and https targets are accepted. Private network addresses and links back to the service itself are rejected.',
  },
  {
    icon: Gauge,
    title: 'Rate limited & monitored',
    description:
      'Every API endpoint is rate limited per IP and all input is validated on the client and on the server.',
  },
  {
    icon: Smartphone,
    title: 'Responsive by default',
    description:
      'The interface adapts from small phones to large desktops and is fully keyboard accessible.',
  },
  {
    icon: Database,
    title: 'Persistent history',
    description:
      'Shortened links are listed in the recent activity section, while QR history stays in your browser.',
  },
]

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-24">
      <div className="card p-6 sm:p-8">
        <h2
          id="about-heading"
          data-section-focus
          tabIndex={-1}
          className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          About LinkCraft
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          LinkCraft pairs a fast, client-side QR code generator with a straightforward URL
          shortener. Both tools live on one page so you can go from a long link to a scannable QR
          code in a couple of clicks.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <li key={feature.title} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

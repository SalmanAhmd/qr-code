import { QrCode } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-white">
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-900">LinkCraft</span>
        </div>
        <p className="text-center text-xs text-slate-500 sm:text-right">
          QR codes are generated in your browser. Shortened links are stored on the LinkCraft server.
        </p>
      </div>
    </footer>
  )
}

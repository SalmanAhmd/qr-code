import { Link2, QrCode } from 'lucide-react'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-sm">
        <QrCode className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-indigo-600 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        The page you are looking for does not exist. If you followed a LinkCraft short link, the
        code may have been removed.
      </p>
      <a
        href="/"
        className="btn-primary mt-8"
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        Back to LinkCraft
      </a>
    </div>
  )
}

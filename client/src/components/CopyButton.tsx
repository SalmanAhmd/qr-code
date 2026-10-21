import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy } from 'lucide-react'
import { copyText } from '../lib/clipboard'

interface CopyButtonProps {
  value: string
  /** Describes what is copied, used for the accessible name. */
  label?: string
  showLabel?: boolean
  className?: string
  onResult?: (copied: boolean) => void
}

export function CopyButton({
  value,
  label = 'link',
  showLabel = false,
  className = 'btn-secondary',
  onResult,
}: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const handleClick = async () => {
    const copied = await copyText(value)
    setState(copied ? 'copied' : 'failed')
    onResult?.(copied)

    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setState('idle'), 2000)
  }

  const Icon = state === 'copied' ? Check : state === 'failed' ? AlertTriangle : Copy

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Copy ${label}`}
      className={className}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {showLabel ? (
        <span>{state === 'copied' ? 'Copied!' : state === 'failed' ? 'Copy failed' : 'Copy'}</span>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied'
          ? `${label} copied to the clipboard`
          : state === 'failed'
            ? `Could not copy the ${label}. Please copy it manually.`
            : ''}
      </span>
    </button>
  )
}

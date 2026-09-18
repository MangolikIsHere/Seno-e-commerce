'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text, label }: { text: string, label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="button button-outline"
      style={{ padding: '4px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}
      title={label || 'Copy to clipboard'}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

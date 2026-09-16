'use client'

import React, { useState } from 'react'

interface SenoImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string
}

export function SenoImage({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
  style,
  ...rest
}: SenoImageProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const isInvalidSrc = !src || (typeof src === 'string' && (src.trim() === '' || src === 'undefined' || src === 'null'))

  if (error || isInvalidSrc) {
    return (
      <div
        className={`seno-fallback-image-wrap ${className} ${fallbackClassName}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-subtle)',
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          width: '100%',
          height: '100%',
          minHeight: '80px',
          padding: '12px',
          textAlign: 'center',
          ...style,
        }}
        aria-label={alt || 'SENO Silhouette'}
      >
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '15px',
            letterSpacing: '1px',
            fontWeight: 600,
            color: 'var(--ink)',
            opacity: 0.6,
          }}
        >
          SENO
        </span>
        <span
          style={{
            fontSize: '8.5px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginTop: '3px',
            opacity: 0.45,
          }}
        >
          STUDIO / 01
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${loaded ? 'img-loaded' : 'img-loading'}`}
      style={{
        ...style,
        transition: 'opacity 0.3s ease',
        opacity: loaded ? 1 : 0.85,
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      {...rest}
    />
  )
}

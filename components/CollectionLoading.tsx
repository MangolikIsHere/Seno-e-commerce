import React from 'react'

export function CollectionLoading() {
  return (
    <div className="collection-page-container" aria-label="Loading collection" role="status">
      <div
        style={{
          width: '180px',
          height: '22px',
          marginBottom: '28px',
          background: 'var(--card-bg, #f4f4f2)',
          animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
        }}
      />
      <div
        className="product-grid columns-4"
        style={{ minHeight: '60vh' }}
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            style={{
              aspectRatio: '3 / 4',
              background: 'var(--card-bg, #f4f4f2)',
              animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes senoSkeletonPulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.95; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

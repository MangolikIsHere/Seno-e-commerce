import React from 'react'

export default function ProductLoading() {
  return (
    <div className="product-detail-container" style={{ minHeight: '80vh', opacity: 0.95 }}>
      {/* Breadcrumb Skeleton */}
      <div
        style={{
          width: '120px',
          height: '14px',
          background: 'var(--card-bg, #f4f4f2)',
          borderRadius: '2px',
          marginBottom: '28px',
          animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
        }}
      />

      <div className="product-detail-grid">
        {/* Gallery View Skeleton */}
        <div className="product-gallery-view">
          <div
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              background: 'var(--card-bg, #f4f4f2)',
              borderRadius: '2px',
              position: 'relative',
              overflow: 'hidden',
              animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'senoSkeletonShimmer 1.8s infinite',
              }}
            />
          </div>
        </div>

        {/* Product Info Skeleton */}
        <div className="product-info-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Category */}
          <div
            style={{
              width: '80px',
              height: '12px',
              background: 'var(--card-bg, #f4f4f2)',
              borderRadius: '2px',
              animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
            }}
          />

          {/* Title */}
          <div
            style={{
              width: '65%',
              height: '24px',
              background: 'var(--card-bg, #f4f4f2)',
              borderRadius: '2px',
              animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
            }}
          />

          {/* Price */}
          <div
            style={{
              width: '90px',
              height: '18px',
              background: 'var(--card-bg, #f4f4f2)',
              borderRadius: '2px',
              animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
            }}
          />

          <hr style={{ border: 'none', borderTop: '1px solid var(--border, #eaeaea)', margin: '8px 0' }} />

          {/* Sizes */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: '44px',
                  height: '40px',
                  background: 'var(--card-bg, #f4f4f2)',
                  borderRadius: '2px',
                  animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <div
              style={{
                width: '100%',
                height: '46px',
                background: 'var(--card-bg, #f4f4f2)',
                borderRadius: '2px',
                animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '100%',
                height: '46px',
                background: 'var(--card-bg, #f4f4f2)',
                borderRadius: '2px',
                animation: 'senoSkeletonPulse 1.4s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes senoSkeletonPulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.95; }
          100% { opacity: 0.6; }
        }
        @keyframes senoSkeletonShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

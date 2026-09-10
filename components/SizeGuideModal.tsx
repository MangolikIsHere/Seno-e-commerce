'use client'

import React from 'react'
import { X } from 'lucide-react'

export function SizeGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="size-guide-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close size guide">
          <X size={20} />
        </button>

        <span className="section-kicker">SENO MEASUREMENTS</span>
        <h2>Size Guide</h2>
        <p className="size-guide-intro">
          All measurements are provided in inches. SENO silhouettes are cut with an intentional relaxed fit.
        </p>

        <div className="size-table-wrapper">
          <table className="size-table">
            <thead>
              <tr>
                <th>SIZE</th>
                <th>CHEST</th>
                <th>WAIST</th>
                <th>HIPS</th>
                <th>SHOULDER</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>XS</td>
                <td>34 - 36&quot;</td>
                <td>28 - 30&quot;</td>
                <td>35 - 37&quot;</td>
                <td>17.0&quot;</td>
              </tr>
              <tr>
                <td>S</td>
                <td>36 - 38&quot;</td>
                <td>30 - 32&quot;</td>
                <td>37 - 39&quot;</td>
                <td>17.5&quot;</td>
              </tr>
              <tr>
                <td>M</td>
                <td>38 - 40&quot;</td>
                <td>32 - 34&quot;</td>
                <td>39 - 41&quot;</td>
                <td>18.0&quot;</td>
              </tr>
              <tr>
                <td>L</td>
                <td>40 - 42&quot;</td>
                <td>34 - 36&quot;</td>
                <td>41 - 43&quot;</td>
                <td>18.7&quot;</td>
              </tr>
              <tr>
                <td>XL</td>
                <td>42 - 44&quot;</td>
                <td>36 - 38&quot;</td>
                <td>43 - 45&quot;</td>
                <td>19.5&quot;</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="size-guide-note">
          If you fall between sizes, we recommend sizing down for a tailored look or taking your standard size for the intended SENO relaxed drape.
        </p>
      </div>
    </div>
  )
}

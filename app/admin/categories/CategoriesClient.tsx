'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Edit2, Layers, Check, X, Eye, EyeOff } from 'lucide-react'
import { deactivateCategory, saveCategory } from '@/lib/categories'

export function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [editing, setEditing] = useState<any | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const input = {
      id: editing?.id,
      name: String(form.get('name') || ''),
      slug: String(form.get('slug') || ''),
      description: String(form.get('description') || ''),
      display_order: Number(form.get('display_order') || 0),
      is_active: form.get('is_active') === 'on'
    }
    startTransition(async () => {
      try {
        await saveCategory(input)
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save category.')
      }
    })
  }

  return (
    <div className="admin-page-container">
      {/* Top Bar */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">TAXONOMY CONTROL</span>
          <h1 className="admin-page-title">Departments & Categories</h1>
          <p className="admin-page-subtitle">
            Manage storefront departments, navigation categories, display order, and visibility.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            className="button button-primary"
            style={{ fontSize: '12px', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setEditing({})}
          >
            <Plus size={15} />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Category Editor Drawer/Card */}
      {editing && (
        <form onSubmit={submit} className="admin-table-card" style={{ padding: '28px', marginBottom: '28px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
            <div>
              <h2 className="admin-card-heading">{editing.id ? 'Edit Category' : 'Create New Category'}</h2>
              <p className="admin-card-subheading">Configure public storefront taxonomy</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Category Name *
              </label>
              <input
                name="name"
                required
                defaultValue={editing.name || ''}
                placeholder="e.g. Western Wear"
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                URL Slug (Optional)
              </label>
              <input
                name="slug"
                defaultValue={editing.slug || ''}
                placeholder="e.g. western-wear"
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
              Curatorial Description
            </label>
            <textarea
              name="description"
              defaultValue={editing.description || ''}
              placeholder="Editorial description displayed on collection landing pages..."
              rows={3}
              style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ width: '140px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Display Priority
              </label>
              <input
                name="display_order"
                type="number"
                min="0"
                defaultValue={editing.display_order || 0}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '16px' }}>
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={editing.is_active !== false}
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ fontWeight: 500 }}>Active and visible in navigation menu</span>
            </label>
          </div>

          {error && <p style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={pending}
              className="button button-primary"
              style={{ fontSize: '12px', padding: '10px 22px' }}
            >
              {pending ? 'Saving...' : 'Save Category'}
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setEditing(null)}
              style={{ fontSize: '12px', padding: '10px 18px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Categories Card List & Table */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">Active Store Categories ({categories.length})</h2>
            <p className="admin-card-subheading">Public catalog navigation structure</p>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="admin-desktop-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>URL Slug</th>
                <th>Linked Pieces</th>
                <th>Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <tr key={category.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{category.name}</div>
                    {category.description && (
                      <div style={{ fontSize: '11px', color: 'var(--muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {category.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)' }}>
                      /{category.slug}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>
                      {category.products?.[0]?.count ?? 0} pieces
                    </span>
                  </td>
                  <td>{category.display_order}</td>
                  <td>
                    <span className={`status-pill ${category.is_active ? 'approved' : 'draft'}`}>
                      {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => setEditing(category)}
                        style={{ fontSize: '11px', padding: '5px 12px' }}
                      >
                        Edit
                      </button>
                      {category.is_active && (
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => startTransition(async () => { await deactivateCategory(category.id); window.location.reload() })}
                          style={{ fontSize: '11px', padding: '5px 10px', color: '#b91c1c' }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="admin-mobile-card-list">
          {categories.map(category => (
            <div key={category.id} className="admin-order-card-mobile">
              <div className="admin-order-card-header">
                <div>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{category.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', fontFamily: 'monospace' }}>/{category.slug}</span>
                </div>
                <span className={`status-pill ${category.is_active ? 'approved' : 'draft'}`}>
                  {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div style={{ padding: '0 16px 12px', fontSize: '12px', color: 'var(--muted)' }}>
                {category.products?.[0]?.count ?? 0} pieces cataloged · Priority: {category.display_order}
              </div>
              <div className="admin-order-card-footer">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setEditing(category)}
                  style={{ width: '100%', fontSize: '12px', padding: '9px 0' }}
                >
                  Edit Category
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

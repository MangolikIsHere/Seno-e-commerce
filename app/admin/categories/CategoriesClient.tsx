'use client'

import { useState, useTransition } from 'react'
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
    const input = { id: editing?.id, name: String(form.get('name') || ''), slug: String(form.get('slug') || ''), description: String(form.get('description') || ''), display_order: Number(form.get('display_order') || 0), is_active: form.get('is_active') === 'on' }
    startTransition(async () => {
      try { await saveCategory(input); window.location.reload() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save category.') }
    })
  }

  return <main className="static-page-container" style={{ maxWidth: '1040px', paddingBottom: '96px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '28px' }}><div><span className="section-kicker">CATALOG CONTROL</span><h1 className="static-page-title">Categories</h1><p style={{ color: 'var(--muted)' }}>Manage public departments without code changes.</p></div><button className="button button-primary" onClick={() => setEditing({})}>Add Category</button></div>
    {editing && <form onSubmit={submit} className="admin-table-card" style={{ padding: '24px', marginBottom: '24px', display: 'grid', gap: '12px' }}><input name="name" required defaultValue={editing.name || ''} placeholder="Category name" className="input-field" /><input name="slug" defaultValue={editing.slug || ''} placeholder="Slug" className="input-field" /><textarea name="description" defaultValue={editing.description || ''} placeholder="Description" className="input-field" /><input name="display_order" type="number" min="0" defaultValue={editing.display_order || 0} placeholder="Display order" className="input-field" /><label><input name="is_active" type="checkbox" defaultChecked={editing.is_active !== false} /> Active</label>{error && <p style={{ color: '#b91c1c' }}>{error}</p>}<div><button disabled={pending} className="button button-primary">{pending ? 'Saving...' : 'Save Category'}</button><button type="button" className="button button-outline" onClick={() => setEditing(null)} style={{ marginLeft: '8px' }}>Cancel</button></div></form>}
    <div className="admin-table-card" style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Order</th><th>Status</th><th /></tr></thead><tbody>{categories.map(category => <tr key={category.id}><td>{category.name}</td><td>/{category.slug}</td><td>{category.products?.[0]?.count ?? 0}</td><td>{category.display_order}</td><td>{category.is_active ? 'Active' : 'Inactive'}</td><td><button className="button button-outline" onClick={() => setEditing(category)}>Edit</button>{category.is_active && <button className="button button-outline" onClick={() => startTransition(async () => { await deactivateCategory(category.id); window.location.reload() })} style={{ marginLeft: '8px' }}>Deactivate</button>}</td></tr>)}</tbody></table></div>
  </main>
}
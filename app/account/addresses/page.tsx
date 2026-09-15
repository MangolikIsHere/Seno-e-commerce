'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Edit2, Plus, MapPin, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchAddresses, createAddress, updateAddress, deleteAddress, Address, AddressInput } from '@/lib/addresses'

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<AddressInput>({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false
  })

  useEffect(() => {
    if (user) {
      loadAddresses()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const loadAddresses = async () => {
    setLoading(true)
    if (user) {
      const data = await fetchAddresses(user.id)
      setAddresses(data)
    }
    setLoading(false)
  }

  const handleAddNew = () => {
    setFormData({
      recipient_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: addresses.length === 0
    })
    setEditId(null)
    setIsEditing(true)
  }

  const handleEdit = (addr: Address) => {
    setFormData({
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      is_default: addr.is_default
    })
    setEditId(addr.id)
    setIsEditing(true)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    if (confirm('Are you sure you want to remove this delivery address?')) {
      const success = await deleteAddress(user.id, id)
      if (success) {
        setAddresses(prev => prev.filter(a => a.id !== id))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    if (editId) {
      const updated = await updateAddress(user.id, editId, formData)
      if (updated) {
        setAddresses(prev => prev.map(a => a.id === editId ? updated : (updated.is_default ? {...a, is_default: false} : a)).sort((a,b) => Number(b.is_default) - Number(a.is_default)))
      }
    } else {
      const created = await createAddress(user.id, formData)
      if (created) {
        if (created.is_default) {
          setAddresses(prev => [created, ...prev.map(a => ({...a, is_default: false}))])
        } else {
          setAddresses(prev => [...prev, created].sort((a,b) => Number(b.is_default) - Number(a.is_default)))
        }
      }
    }
    setIsEditing(false)
    setLoading(false)
  }

  if (authLoading || (loading && !isEditing)) {
    return (
      <main className="static-page-container" style={{ minHeight: '60vh', padding: '100px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading address directory...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="static-page-container" style={{ minHeight: '60vh', textAlign: 'center', maxWidth: '480px' }}>
        <h1 className="static-page-title" style={{ marginBottom: '16px' }}>Sign In Required</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>Please sign in to access your personal address directory.</p>
        <Link href="/account" className="button button-primary" style={{ padding: '12px 28px' }}>Sign In</Link>
      </main>
    )
  }

  return (
    <main className="static-page-container" style={{ maxWidth: '820px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '28px' }}>
        <Link 
          href="/account" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.5px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Account</span>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '36px' }}>
        <div>
          <span className="section-kicker">CLIENT SUITE</span>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '30px',
            fontWeight: 400,
            letterSpacing: '-0.5px',
            margin: '4px 0 6px'
          }}>
            Saved Addresses
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            Manage private delivery destinations and shipping preferences
          </p>
        </div>

        {!isEditing && (
          <button
            className="button button-primary"
            style={{ fontSize: '12px', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleAddNew}
          >
            <Plus size={14} />
            <span>Add New Address</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div style={{ background: '#fff', padding: '32px', border: '1px solid var(--border)', borderRadius: '2px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px' }}>
            {editId ? 'Edit Address' : 'New Delivery Address'}
          </h2>
          <form onSubmit={handleSubmit} className="form-stack">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>Recipient Name</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.recipient_name}
                  onChange={e => setFormData({...formData, recipient_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>Contact Phone</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>Address Line 1</label>
              <input
                type="text"
                className="form-input-field"
                value={formData.address_line1}
                onChange={e => setFormData({...formData, address_line1: e.target.value})}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>Address Line 2 (Optional)</label>
              <input
                type="text"
                className="form-input-field"
                value={formData.address_line2}
                onChange={e => setFormData({...formData, address_line2: e.target.value})}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>City</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>State</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.state}
                  onChange={e => setFormData({...formData, state: e.target.value})}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>Postal / PIN Code</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.postal_code}
                  onChange={e => setFormData({...formData, postal_code: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '6px' }}>Country</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.country}
                  onChange={e => setFormData({...formData, country: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.is_default}
                onChange={e => setFormData({...formData, is_default: e.target.checked})}
                style={{ width: 'auto', margin: 0 }}
              />
              <span>Set as default primary delivery address</span>
            </label>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                type="button" 
                className="button button-outline" 
                style={{ padding: '10px 20px', fontSize: '12px' }} 
                onClick={() => setIsEditing(false)} 
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="button button-primary" 
                style={{ padding: '10px 24px', fontSize: '12px' }} 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {addresses.length === 0 ? (
            <div style={{ border: '1px solid var(--border)', padding: '60px 24px', textAlign: 'center', background: 'var(--surface-subtle)' }}>
              <MapPin size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 16px' }}>You haven&apos;t added any delivery addresses yet.</p>
              <button className="button button-primary" style={{ fontSize: '12px', padding: '10px 20px' }} onClick={handleAddNew}>
                Add Your First Address
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {addresses.map(addr => (
                <div 
                  key={addr.id} 
                  style={{ 
                    border: '1px solid var(--border)', 
                    padding: '24px', 
                    position: 'relative', 
                    background: '#fff',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                        {addr.recipient_name}
                      </h3>
                      {addr.is_default && (
                        <span className="status-pill approved" style={{ fontSize: '10px' }}>
                          Default
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--muted)' }}>Phone: {addr.phone}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--ink)' }}>
                      {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}
                    </p>
                    <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--muted)' }}>
                      {addr.city}, {addr.state} {addr.postal_code}, {addr.country}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <button 
                      onClick={() => handleEdit(addr)} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '12px', 
                        color: 'var(--ink)', 
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 500
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(addr.id)} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '12px', 
                        color: '#b91c1c', 
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 500
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}


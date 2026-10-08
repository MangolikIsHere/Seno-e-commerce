'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Edit2, Plus, MapPin, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchAddresses, createAddress, updateAddress, deleteAddress, Address, AddressInput } from '@/lib/addresses'
import { AccountShell } from '@/components/account/AccountShell'

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
      <AccountShell title="Saved Addresses">
        <div className="account-loading-card">
          <p>Loading address directory...</p>
        </div>
      </AccountShell>
    )
  }

  if (!user) {
    return (
      <AccountShell title="Sign In Required">
        <div className="account-empty-order-card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: '0 0 10px' }}>Sign In Required</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px' }}>Please sign in to access your personal address directory.</p>
          <Link href="/account" className="button button-primary" style={{ padding: '10px 24px', fontSize: '12px' }}>Sign In</Link>
        </div>
      </AccountShell>
    )
  }

  return (
    <AccountShell title="Saved Addresses" subtitle="Manage private delivery destinations and shipping preferences">
      <div className="account-section-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="account-section-heading">Delivery Directory</h2>
            <p className="account-section-subheading">Your registered delivery destinations</p>
          </div>

          {!isEditing && (
            <button
              className="button button-primary"
              style={{ fontSize: '12px', padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleAddNew}
            >
              <Plus size={14} />
              <span>Add New Address</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="admin-table-card" style={{ padding: '28px', background: '#fff' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
              {editId ? 'Edit Delivery Address' : 'New Delivery Destination'}
            </h3>
            <form onSubmit={handleSubmit} className="form-stack">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>Recipient Name *</label>
                  <input
                    type="text"
                    className="form-input-field"
                    value={formData.recipient_name}
                    onChange={e => setFormData({...formData, recipient_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>Contact Phone *</label>
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
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>Address Line 1 *</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.address_line1}
                  onChange={e => setFormData({...formData, address_line1: e.target.value})}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>Address Line 2 (Optional)</label>
                <input
                  type="text"
                  className="form-input-field"
                  value={formData.address_line2}
                  onChange={e => setFormData({...formData, address_line2: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>City *</label>
                  <input
                    type="text"
                    className="form-input-field"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>State *</label>
                  <input
                    type="text"
                    className="form-input-field"
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>PIN Code *</label>
                  <input
                    type="text"
                    className="form-input-field"
                    value={formData.postal_code}
                    onChange={e => setFormData({...formData, postal_code: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>Country</label>
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
                  type="submit"
                  className="button button-primary"
                  style={{ padding: '10px 24px', fontSize: '12px' }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  style={{ padding: '10px 20px', fontSize: '12px' }}
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {addresses.length === 0 ? (
              <div className="account-empty-order-card">
                <MapPin size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: '0 0 6px' }}>No Saved Addresses</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                  Save your home or delivery destination for seamless express checkouts.
                </p>
                <button className="button button-primary" style={{ fontSize: '12px', padding: '10px 22px' }} onClick={handleAddNew}>
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    className="admin-table-card"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                          {addr.recipient_name}
                        </h3>
                        {addr.is_default && (
                          <span className="status-pill approved" style={{ fontSize: '10px' }}>
                            Default
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: 'var(--muted)' }}>Phone: {addr.phone}</p>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
                        {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}
                      </p>
                      <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--muted)' }}>
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
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AccountShell>
  )
}

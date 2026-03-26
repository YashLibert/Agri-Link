import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../hooks/useSocket.js'
import api from '../api/axios.js'

export default function BuyerDashboard() {
  const { user, logout }          = useAuth()
  const [tab, setTab]             = useState('browse')
  const [listings, setListings]   = useState([])
  const [orders, setOrders]       = useState([])
  const [filters, setFilters]     = useState({ crop: 'all', grade: 'all', city: 'all' })
  const [notification, setNotif]  = useState(null)
  const [loading, setLoading]     = useState(false)
  const [liveAlert, setLiveAlert] = useState(null)
  const [traceData, setTraceData] = useState(null)
  const [traceId, setTraceId]     = useState('')

  useSocket(user, {
    onNewListing: (data) => {
      setListings(prev => [data, ...prev])
      setLiveAlert(`New Grade ${data.grade} ${data.crop} listing in ${data.city} — ₹${data.askingPrice}/q`)
      setTimeout(() => setLiveAlert(null), 5000)
    },
    onOrderConfirmed: () => fetchOrders(),
  })

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.crop !== 'all')  params.crop  = filters.crop
      if (filters.grade !== 'all') params.grade = filters.grade
      if (filters.city !== 'all')  params.city  = filters.city
      const res = await api.get('/api/listings', { params })
      setListings(res.data.listings)
    } catch (error) {
      console.error('Failed to fetch buyer listings:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/api/orders/my')
      setOrders(res.data.orders)
    } catch (error) {
      console.error('Failed to fetch buyer orders:', error)
    }
  }, [])

  useEffect(() => { fetchListings() }, [fetchListings])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const placeOrder = async (listing) => {
    try {
      await api.post('/api/orders', {
        listingId  : listing._id,
        quantity   : listing.quantity,
        agreedPrice: listing.askingPrice,
      })
      showNotif(`Order placed for ${listing.crop} — ${listing.quantity}q`)
      fetchListings()
      fetchOrders()
    } catch (err) {
      showNotif(err.response?.data?.error || 'Order failed', true)
    }
  }

  const scanTrace = async () => {
    if (!traceId.trim()) return
    try {
      const res = await api.get(`/api/trace/${traceId.trim()}`)
      setTraceData(res.data)
    } catch {
      showNotif('Lot not found', true)
    }
  }

  const showNotif = (msg, error = false) => {
    setNotif({ msg, error })
    setTimeout(() => setNotif(null), 4000)
  }

  const cropIcons = { Onion: '🧅', Tomato: '🍅', Potato: '🥔', Wheat: '🌾', Grapes: '🍇', Mango: '🥭' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>

      {/* Sidebar */}
      <aside style={{
        background: 'var(--forest)', padding: '28px 0',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(82,183,136,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--mint)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', fontWeight: 800, fontSize: 18 }}>A</div>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--white)', fontSize: 20, fontWeight: 700 }}>AgriLink</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'var(--mint)', fontSize: 13, fontWeight: 600 }}>{user?.name}</p>
            <p style={{ color: 'rgba(149,213,178,0.6)', fontSize: 12 }}>Verified buyer</p>
          </div>
        </div>

        <nav style={{ padding: '20px 0', flex: 1 }}>
          {[
            { id: 'browse',  icon: '◈', label: 'Browse listings' },
            { id: 'orders',  icon: '◉', label: 'My orders' },
            { id: 'trace',   icon: '◎', label: 'QR trace' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 24px', width: '100%', textAlign: 'left',
                background: tab === item.id ? 'rgba(82,183,136,0.12)' : 'transparent',
                borderLeft: tab === item.id ? '3px solid var(--mint)' : '3px solid transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                color: tab === item.id ? 'var(--mint)' : 'rgba(149,213,178,0.6)',
                fontSize: 14, fontWeight: tab === item.id ? 600 : 400, transition: 'all 0.2s'
              }}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <button onClick={logout} style={{
          margin: '0 16px', padding: '10px 16px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius-md)', color: 'rgba(149,213,178,0.7)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left'
        }}>← Sign out</button>
      </aside>

      {/* Main */}
      <main style={{ padding: '32px 40px', minHeight: '100vh' }}>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                background: notification.error ? '#FCEBEB' : 'var(--forest)',
                color: notification.error ? 'var(--red)' : 'var(--white)',
                padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500,
                boxShadow: 'var(--shadow-lg)', zIndex: 1000
              }}
            >{notification.msg}</motion.div>
          )}
        </AnimatePresence>

        {/* Live alert bar */}
        <AnimatePresence>
          {liveAlert && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'var(--forest)', borderRadius: 'var(--radius-md)',
                padding: '12px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--white)', fontWeight: 500 }}>Live: {liveAlert}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browse tab */}
        {tab === 'browse' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>
              Browse Listings
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 15 }}>
              {listings.length} available listings — connect directly with farmers
            </p>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { key: 'crop',  label: 'Crop',  opts: ['all','Onion','Potato','Tomato','Wheat'] },
                { key: 'grade', label: 'Grade', opts: ['all','Grade A','Grade B','Grade C'] },
                { key: 'city',  label: 'City',  opts: ['all','Pune','Nashik','Nagpur','Mumbai','Solapur'] },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {f.label}
                  </label>
                  <select
                    value={filters[f.key]}
                    onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{
                      padding: '8px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500,
                      border: '1.5px solid rgba(27,67,50,0.15)', background: 'var(--white)',
                      color: 'var(--forest)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                      outline: 'none'
                    }}
                  >
                    {f.opts.map(o => <option key={o} value={o}>{o === 'all' ? `All ${f.label}s` : o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Listings grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 32, height: 32, border: '3px solid var(--mint)', borderTopColor: 'var(--forest)', borderRadius: '50%', margin: '0 auto' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {listings.length === 0 ? (
                  <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-md)', padding: 48, textAlign: 'center', border: '1px dashed rgba(27,67,50,0.15)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No listings match your filters.</p>
                  </div>
                ) : listings.map((l, i) => (
                  <motion.div key={l._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      background: 'var(--white)', borderRadius: 'var(--radius-md)',
                      padding: '20px 24px', border: '1px solid rgba(27,67,50,0.08)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(27,67,50,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {cropIcons[l.crop] || '🌾'}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)' }}>
                          {l.crop} — {l.quantity} quintals
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                          {l.grade} · {l.city} · {l.farmerName || l.farmerId?.name || 'Farmer'}
                        </div>
                        {l.apedaCertified && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#27500A', background: '#EAF3DE', borderRadius: 100, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}>
                            APEDA certified
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                          ₹{l.askingPrice?.toLocaleString('en-IN')}/q
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Total: ₹{(l.quantity * l.askingPrice)?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => placeOrder(l)}
                        style={{
                          background: 'var(--forest)', color: 'var(--white)',
                          border: 'none', borderRadius: 100, padding: '10px 20px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--font-body)'
                        }}
                      >Place order</motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>My Orders</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>{orders.length} total orders</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {orders.length === 0 ? (
                <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-md)', padding: 48, textAlign: 'center', border: '1px dashed rgba(27,67,50,0.15)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No orders yet. Browse listings to place your first order.</p>
                </div>
              ) : orders.map((o, i) => (
                <motion.div key={o._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    background: 'var(--white)', borderRadius: 'var(--radius-md)',
                    padding: '20px 24px', border: '1px solid rgba(27,67,50,0.08)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest)', marginBottom: 4 }}>
                      {o.crop} — {o.quantity} quintals
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Farmer: {o.farmerId?.name || 'Farmer'} · ₹{o.agreedPrice?.toLocaleString('en-IN')}/q
                    </div>
                    {o.listingId?.lotId && (
                      <button onClick={() => { setTraceId(o.listingId.lotId); setTab('trace') }}
                        style={{ fontSize: 11, color: 'var(--forest-light)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: 6, padding: 0 }}>
                        View trace →
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                      ₹{(o.quantity * o.agreedPrice)?.toLocaleString('en-IN')}
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Trace tab */}
        {tab === 'trace' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--forest)', marginBottom: 6, fontWeight: 700 }}>
              QR Traceability Scanner
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>
              Enter a lot ID to view the complete farm-to-buyer journey.
            </p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              <input
                value={traceId}
                onChange={e => setTraceId(e.target.value)}
                placeholder="Enter lot ID e.g. LOT-1710853200000-X7K2P"
                style={{
                  flex: 1, padding: '12px 18px', borderRadius: 'var(--radius-md)',
                  border: '1.5px solid rgba(27,67,50,0.15)', background: 'var(--white)',
                  fontSize: 14, color: 'var(--text-dark)', fontFamily: 'var(--font-mono)', outline: 'none'
                }}
              />
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={scanTrace}
                style={{
                  background: 'var(--forest)', color: 'var(--white)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  padding: '12px 24px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)'
                }}
              >Scan</motion.button>
            </div>

            {traceData && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Integrity badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: traceData.integrity === 'VERIFIED' ? '#EAF3DE' : '#FCEBEB',
                  border: `1px solid ${traceData.integrity === 'VERIFIED' ? '#3B6D11' : '#A32D2D'}`,
                  borderRadius: 100, padding: '8px 20px', marginBottom: 24
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: traceData.integrity === 'VERIFIED' ? '#27500A' : '#791F1F', display: 'inline-block' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: traceData.integrity === 'VERIFIED' ? '#27500A' : '#791F1F' }}>
                    Chain {traceData.integrity} · {traceData.total_events} events
                  </span>
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'rgba(27,67,50,0.1)' }} />
                  {traceData.events?.map((event, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      style={{ display: 'flex', gap: 24, marginBottom: 20 }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--forest)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--mint)', fontSize: 12, fontWeight: 700,
                        flexShrink: 0, zIndex: 1
                      }}>{event.step}</div>
                      <div style={{
                        background: 'var(--white)', borderRadius: 'var(--radius-md)',
                        padding: '16px 20px', flex: 1, border: '1px solid rgba(27,67,50,0.08)',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest)', marginBottom: 4 }}>{event.event}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {new Date(event.timestamp).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--cream)', padding: '4px 8px', borderRadius: 4 }}>
                          {event.hash}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    available: ['#EAF3DE', '#27500A', 'Available'],
    sold:      ['#FAEEDA', '#633806', 'Sold'],
    confirmed: ['#E6F1FB', '#0C447C', 'Confirmed'],
    in_transit:['#FAEEDA', '#633806', 'In transit'],
    delivered: ['#EAF3DE', '#27500A', 'Delivered'],
  }
  const [bg, color, label] = map[status] || ['#F1EFE8', '#444441', status]
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: bg, color }}>
      {label}
    </span>
  )
}
